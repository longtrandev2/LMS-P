# LMS-P — Hệ thống quản lý học tập môn Lập trình mạng

LMS Client/Server cho môn học lập trình: **Next.js (App Router) + FastAPI + MySQL 8 + RabbitMQ**, kèm grading worker chạy code sinh viên trong **Docker sandbox** (no-network, giới hạn CPU/RAM/time). Nộp bài bất đồng bộ qua queue (202 + submission_id), kết quả đẩy về client qua WebSocket. Đầy đủ spec: nghiệp vụ (M1–M10), thiết kế DB, hợp đồng API/message — xem [`docs/`](./docs) (nguồn chân lý của dự án, spec-first).

## Cấu trúc

```
apps/api      FastAPI — REST /api/v1, WebSocket /ws
apps/web      Next.js — UI 3 vai trò, Monaco editor
apps/worker   Consumer RabbitMQ + sandbox chấm bài (aio-pika, docker-py)
infra/        docker-compose.yml, nginx/ (profile prod)
scripts/      seed + dev utilities
storage/      volume học liệu (gitignored)
```

## Prerequisites

- **Docker Desktop** (backend WSL2 trên Windows) — chạy toàn bộ stack
- Node.js 20+ (chỉ khi dev `apps/web` ngoài container)
- Python 3.12 (chỉ khi dev `apps/api`/`apps/worker` ngoài container)

## Chạy dự án

```powershell
# 1. Environment — compose đọc .env NGAY thư mục infra/
copy .env.example infra\.env   # mở infra\.env, dán JWT_SECRET (lệnh gen trong comment)

# 2. Toàn stack (từ thư mục infra/)
cd infra
docker compose up -d --build

# 3. Migration + seed dữ liệu ban đầu (bảng + roles + admin)
docker compose exec api alembic upgrade head
docker compose exec api python scripts/seed.py
```

> Seed in ngày mật khẩu admin ra console (v1 chưa có email); lecturer/student demo dùng `Demo@12345`.

## URLs

| Dịch vụ | URL |
|---|---|
| Web | http://localhost:3000 |
| API + Swagger | http://localhost:8000/docs |
| RabbitMQ Management | http://localhost:15672 (lms/lms) |
| MySQL | localhost:3306 (lms/lms) |
| nginx (prod) | http://localhost:80 — `docker compose --profile prod up -d` |

## Scale worker trước giờ thi

```powershell
cd infra
docker compose up -d --scale worker=4
```

## Chạy worker ngoài compose (fallback)

Từ P3 worker cần điều khiển Docker host để chạy sandbox. Nếu mount
`/var/run/docker.sock` không hoạt động trên máy, chạy worker trực tiếp trên host:

```powershell
cd apps/worker
pip install -r requirements.txt
# Defaults trong worker/settings.py đã trỏ localhost; override qua env vars nếu cần
python -m worker.main
```

## Tài liệu

- Spec yêu cầu: [`docs/srs.md`](./docs/srs.md)
- Kiến trúc & sandbox: [`docs/system-architecture.md`](./docs/system-architecture.md)
- Database: [`docs/database-design.md`](./docs/database-design.md) · API: [`docs/api-spec.md`](./docs/api-spec.md)
- Messages: [`docs/message-contracts.md`](./docs/message-contracts.md) · Quyết định kỹ thuật: [`docs/tech-decisions.md`](./docs/tech-decisions.md)
- Lộ trình: [`docs/development-roadmap.md`](./docs/development-roadmap.md)
