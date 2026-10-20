# Kiến trúc hệ thống — LMS

| | |
|---|---|
| Phiên bản | 1.0 — 2026-10-20 |
| Nguồn | `srs.md`; ràng buộc stack từ Subject (Next.js/Python/MySQL/REST/WS/RabbitMQ) |
| Nguyên tắc | Đúng tinh thần đề, đúng quy mô môn học — modular monolith, không over-engineering |

## 1. Nguyên tắc
1. **Tách mối quan tâm:** API nghiệp vụ tách khỏi hạ tầng chấm bài; không bao giờ chạy code sinh viên trong tiến trình API.
2. **Bất đồng bộ cho tác vụ nặng:** nộp bài → hàng đợi; API trả 202 + submission_id ngay.
3. **API stateless:** không session server-side (JWT) → scale ngang được khi cần.
4. **Server-authoritative:** thời gian thi, trạng thái chấm, điểm — client chỉ hiển thị.
5. **Bảo mật theo chiều sâu:** auth → RBAC service-level → validate → sandbox isolate → audit.

## 2. Kiến trúc tổng thể

```
[Next.js App Router + TS + Tailwind + Monaco]
        │ HTTPS REST /api/v1        │ WSS /ws
        ▼                           ▼
[nginx (profile: prod) — reverse proxy, TLS]
        ▼
[API Server — FastAPI (uvicorn, 1 instance v1)]
   │  modules M1..M10 (router→service→repository)
   │  WS ConnectionManager (in-process)
   │  ExamSweeper (asyncio task, 10s)
   ├──▶ MySQL 8 (SQLAlchemy 2 + Alembic)
   ├──▶ RabbitMQ ──exchange lms──▶ q.grading ──▶ [Grading Worker ×N]
   │                                  ▲              │ docker-py
   │                                  │              ▼
   │                              q.events ◀──── Docker sandbox one-shot
   │                                  │        (no-network, limits)
   └──▶ Volume storage/ (học liệu — StorageService abstraction)
        (Worker consume q.events → broadcast WS tới đúng user)
```

## 3. Thành phần & trách nhiệm

| Thành phần | Công nghệ | Trách nhiệm |
|---|---|---|
| Web | Next.js 15, TS, Tailwind, shadcn/ui, Monaco (`@monaco-editor/react`), TanStack Query, native WebSocket client | UI 3 vai trò; code editor; live update |
| API | Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2 (async), Alembic, PyJWT, passlib[argon2], aio-pika (publish + consume events) | REST /api/v1; auth/RBAC; nghiệp vụ M1–M10; WS hub; sweeper kỳ thi |
| Worker | Python 3.12, aio-pika consumer, docker SDK | Consume `grading.submit`; compile + run sandbox; chấm; ghi kết quả; publish `events.ws` |
| Sandbox | Docker container one-shot mỗi test | BR10: no network, mem/cpu/pids limit, read-only rootfs + tmpfs, non-root, wall-time timeout, output cap |
| MySQL | 8.4 InnoDB | Dữ liệu giao dịch (xem `database-design.md`) |
| RabbitMQ | 3.13 + management UI | Phân phối chấm; events WS; DLQ |
| nginx | compose profile `prod` | Reverse proxy /api, /ws, static Next; TLS termination khi demo production-like |
| Flower / RabbitMQ UI | management plugin | Giám sát hàng đợi khi demo (tùy chọn) |

## 4. Backend pattern — modular monolith

```
apps/api/app/
├─ core/            # config (pydantic-settings), security (JWT/argon2), db session, exceptions, audit helper
├─ modules/
│  ├─ identity/     # auth, users, roles       → router.py, service.py, repository.py, schemas.py, models.py
│  ├─ academics/    # courses, classes, enrollments, materials
│  ├─ questions/    # question bank, test cases
│  ├─ assignments/  # assignments, quiz taking, submissions (write path)
│  ├─ grading/      # submission status/read, regrade
│  ├─ exams/        # exams, sessions, answers, sweeper
│  ├─ gradebook/    # policy, computed grades, adjustments, export
│  ├─ notifications/
│  └─ admin/        # settings, audit viewer, stats
├─ ws/              # connection manager, auth, event router (consume q.events)
├─ events/          # amqp publish/consume wiring (aio-pika)
└─ main.py          # app factory, lifespan (sweeper + event consumer)
```

- Luồng: **router** (validate, auth) → **service** (nghiệp vụ, BR, audit) → **repository** (SQLAlchemy).
- Lỗi統 nhất qua exception handler → envelope chuẩn (xem `api-spec.md`).
- Hợp đồng API: OpenAPI tự sinh, version `/api/v1`.

```
apps/worker/
├─ consumer.py      # aio-pika: manual ack, retry header, DLQ, prefetch, concurrency
├─ grader.py        # orchestrate: fetch submission + tests → compile → run tests → score → persist → publish event
├─ runner.py        # docker-py: container one-shot, limits, timeout, output capture
├─ languages.py     # config ngôn ngữ: image, compile cmd, run cmd (python 3.12, gcc, g++)
└─ compare.py       # so sánh output (trim trailing whitespace/newline)
```

## 5. Luồng chấm bài (sequence)

```
Student        API              RabbitMQ         Worker          Docker        MySQL
  │ POST submit  │                  │               │               │             │
  │─────────────▶│ validate+txn    │               │               │             │
  │              │──insert pending─────────────────────────────────────────────▶ │
  │              │──publish grading.submit (prio)─▶│               │             │
  │◀──202+id─────│                  │               │               │             │
  │              │                  │──deliver────▶ │ fetch code+tests ─────────▶│
  │              │                  │               │─ compile ────▶│             │
  │              │                  │               │─ run test ×N ▶│             │
  │              │                  │               │─ persist results ────────▶│
  │              │                  │◀─ publish events.ws (graded) ─│             │
  │◀──WS push────│◀─ consume q.events│               │──ack─────────│             │
```

Đảm bảo tin cậy: manual ack SAU khi ghi DB · idempotent theo submission_id+attempt · retry 3 → DLQ · queue priority (thi=10, bài=5, run thử=1) · prefetch thấp.

## 6. Sandbox — thực thi an toàn (BR10)

Mỗi lần chạy = 1 container Docker dùng một lần rồi xóa:
- `network_disabled=True` — không mạng tuyệt đối.
- `mem_limit` (mặc định 256MB), `pids_limit=64`, `nano_cpus` (1 CPU), wall-time timeout per test (mặc định 5s) → quá hạn kill + timeout.
- `read_only=True` + `tmpfs /tmp/sandbox` (workdir, size limit) — filesystem chính chỉ đọc.
- Chạy bằng user non-root (`user="nobody"`), bỏ capabilities mặc định.
- Stdout/stderr capture, truncate 64KB — chống spam output.
- Biên dịch riêng một bước (container compile → artifact vào tmpfs/volume tạm); Python bỏ qua.
- Image fix version, cấu hình per-language (`worker/languages.py` — thêm ngôn ngữ = thêm entry, không đụng lõi):

| Ngôn ngữ | Image | Compile | Run | Wall timeout | Memory |
|---|---|---|---|---|---|
| python | python:3.12-slim | — | `python main.py` | 5s | 256MB |
| c | gcc:13 | `gcc -O2 -o main main.c` | `./main` | 5s | 256MB |
| cpp | gcc:13 | `g++ -O2 -o main main.cpp` | `./main` | 5s | 256MB |
| java | eclipse-temurin:21-jdk-alpine | `javac Main.java` | `java -Xss64m Main` | 10s | 512MB |

- Quy ước tên tệp nộp: `main.py` / `main.c` / `main.cpp` / `Main.java` (Java bắt buộc public class `Main` — chuẩn online judge, hiển thị rõ trong UI editor).
- Worker chạy cùng host Docker, KHÔNG truy cập trực tiếp volume dữ liệu nhạy cảm ngoài tmpfs.

## 7. Realtime (WebSocket)

- Endpoint `GET /ws?token=<access_token>` — auth khi bắt tay, reject 401 nếu token sai/hết hạn.
- **ConnectionManager in-process** (dict user_id → connections). 1 user nhiều tab = nhiều connection.
- Nguồn event: worker publish `events.ws` → API consume → route theo `user_id` trong payload → push.
- Heartbeat: server `ping` 30s; client reconnect backoff 1s→2s→5s→30s; refetch state qua REST sau reconnect (không tin message bị rớt).
- Catalog event: xem `message-contracts.md`.

## 8. Kỳ thi — concurrency

- **Sweeper** (asyncio task, chạy mỗi 10s trong API): query `exam_sessions` có `status='in_progress' AND ends_at <= now` → transaction: đổi status, chấm MCQ từ exam_answers, tạo submission code priority=10, publish queue, ghi exam_events(auto_submit).
- Autosave: `PUT /exam-sessions/{id}/answers` idempotent (upsert theo question), debounce client 3s + interval 15s.
- Nộp dồn dập cuối giờ: queue hấp thụ; worker scale trước giờ thi (`docker compose up -d --scale worker=4`).
- 1 phiên/thí sinh (unique index); đề trả về sau khi session tạo (BR9), shuffle per-student nếu bật.

## 9. Bảo mật

| Lớp | Biện pháp |
|---|---|
| Auth | argon2id; JWT access 15m + refresh 7d rotate (hash lưu DB, revoke được); lock tạm khi brute-force |
| Phân quyền | RBAC + kiểm tra enrollment ở service (BR1/BR2) |
| Transport | HTTPS/WSS qua nginx (prod); dev http nội bộ |
| App | Pydantic validate toàn bộ input; ORM tham số hóa; CORS whitelist; rate limit login; Idempotency-Key |
| Thực thi | Sandbox mục 6 |
| Audit | audit_logs append-only cho mọi thao tác nhạy cảm (BR7) |
| Bí mật | `.env` + pydantic-settings; không commit secret |

## 10. Triển khai

- Dev: `docker compose up` (mysql, rabbitmq, api, worker, web); hot-reload volumes; seed script tạo admin + dữ liệu demo.
- Prod-like demo: `docker compose --profile prod up` (+ nginx 80/443).
- Backup: `mysqldump` cron hàng ngày + trước kỳ thi.
- Health: `GET /health` (DB+AMQP check), `GET /health/queue` (độ sâu q.grading).

## 11. Đường mở rộng (documented, KHÔNG xây v1)

| Khi nào | Làm gì |
|---|---|
| Nhiều instance API | Tách WS hub sang Redis pub/sub (worker publish Redis thay AMQP events) |
| WS đông + sticky khó | Gateway WS riêng + Redis |
| File lớn/nhiều | StorageService swap sang S3/MinIO (interface đã trừu tượng hóa) |
| Báo cáo nặng | MySQL read-replica |
| Worker nhiều node | giữ nguyên (worker đã stateless); thêm autoscale theo queue depth |
| Chấm nhiều ngôn ngữ | thêm entry trong `worker/languages.py` + image — không đụng lõi |
