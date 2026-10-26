# Lộ trình phát triển — LMS

| | |
|---|---|
| Phiên bản | 1.3 — 2026-10-25 |
| Nguồn | `srs.md`, `system-architecture.md` |
| Nguyên tắc | Mỗi phase chốt được một mảng demo chạy thật; spec-first, code theo spec |

## Tổng quan phase

| Phase | Nội dung | Kết quả demo | Ước lượng |
|---|---|---|---|
| P0 | Scaffold + compose + seed khung | `docker compose up` chạy skeleton, /docs mở được | 1 buổi |
| P1 | Nền tảng: M1 auth/RBAC + M2 lớp học + M3 học liệu + audit/notifications nền | Login 3 role, quản lý lớp, upload học liệu | 2–3 buổi |
| P2 | M4 ngân hàng câu hỏi + M5 quiz + M8 sổ điểm v1 | Giao quiz → chấm đồng bộ → vào bảng điểm | 2 buổi |
| P3 ⭐ | M6 pipeline chấm lập trình end-to-end | Nộp code → queue → sandbox → kết quả live WS | 3 buổi |
| P4 | M7 kỳ thi | Phòng thi countdown, autosave, auto-submit, monitor | 2–3 buổi |
| P5 | Hoàn thiện M10 + run thử + CSV + demo script | Demo trọn vẹn theo kịch bản | 1–2 buổi |

Nếu gấp show giữa chừng: P0 → P1 → nhảy P3 (P2 đưa về sau) — pipeline chấm là phần đáng nhớ nhất.

**Trạng thái 2026-10-20 (wave 1 — branch `feat/identity-and-class-management`):** P0 ✅ (gộp scaffold vào wave 1) · P1 HOÀN TẤT (wave 2, 2026-10-21, branch feat/materials-and-realtime-notifications): M1+M2+M3 materials + notifications qua WebSocket (lịch sử trước quyết định 23/10) + contract suite — pytest 95/95, FE build/lint pass · chờ user verify demo → PR.

**Wave 2.5 (khởi động 2026-10-21, cập nhật 2026-10-25 — chốt ghi danh 1 chiều, bỏ self-enroll/catalog/khung giờ):** hồ sơ cá nhân + avatar (FR-AUTH-03), admin quản trị user đầy đủ (FR-AUTH-05/07), thuộc tính lớp: sĩ số tối đa + phòng + trạng thái + credits/GV phụ (FR-CRS-01, BR11–13), **lịch học cấu trúc theo buổi + lặp tuần + lịch tuần SV** (FR-CRS-05/06/07 — subject "schedules"), ghi danh 1 chiều lecturer/admin thêm SV theo mã SV/email (FR-CRS-02), search/phân trang/sort mọi danh sách (FR-CRS-04). Spec đã cập nhật (srs/api-spec/db-design) — code theo branch `feat/profile-enrollment-and-list-ux`.

## P0 — Scaffold
- Việc: monorepo `apps/api`, `apps/web`, `apps/worker`, `infra/` (compose: mysql, rabbitmq-management, api, worker, web; profile prod: nginx); app factory FastAPI + `/health`; Next.js init + layout + AuthProvider khung; worker entry print.consume;
- Migration rỗng Alembic; `.env.example`; seed admin.
- Xong khi: compose up xanh cả 5 service; /health 200 (check DB+AMQP); login admin được (seed).

## P1 — Nền tảng (M1–M3)
- Việc: JWT+refresh+rotate, lock brute-force; CRUD users + import CSV; RBAC dependency; courses/classes/enrollments; materials upload/download (StorageService volume); audit helper + notification REST endpoints; UI: login, admin users, lecturer classes, student "lớp của tôi".
- Xong khi: BR1/BR2 enforce (student không vào lớp lạ → 403 ENROLLMENT_REQUIRED); import CSV 50 user chạy; upload PDF + download đúng.

## P2 — Quiz & điểm (M4/M5/M8)
- Việc: bank đề đầy đủ — folder cây, độ khó/tag, loại Đúng/Sai + điền khuyết, ảnh câu hỏi, import/export CSV, thùng rác + duplicate; assembly đề: chọn tay, random theo filter, đề theo section, preview; publish assignment thì ghim phiên bản câu, điểm và thứ tự; quiz MCQ nộp cả bài qua `assignment_attempts`, chấm đồng bộ; bài không phải quiz nộp từng câu; gradebook computed từ assignment + exam với trạng thái pending/final; UI bank đề, giao bài, làm quiz, bảng điểm. (Essay chấm tay — defer.)
- Xong khi: `max_attempts`/deadline/late enforce theo lượt toàn bài quiz hoặc từng câu bài khác; nộp trùng Idempotency-Key không tăng lượt; điểm tổng khớp công thức FR-GB-02 (case test tay).

## P3 ⭐ — Chấm lập trình (M6)
- Việc: submit code → pending + publish AMQP (aio-pika) + Idempotency-Key; worker consumer (manual ack, retry, DLQ, priority); runner docker-py sandbox (limits đầy đủ BR10); grader compare + score trọng số; grading_results/test_results; API consume q.events → WS push `submission.status/graded`; UI Monaco editor + panel kết quả từng test live + trạng thái; regrade; (S nếu kịp: Run thử, verify đề).
- Xong khi: nộp code Python đúng/sai/compile error/timeout → đúng trạng thái + điểm; test ẩn không lộ (check response); kill worker giữa chừng → redeliver chấm tiếp; `--scale worker=2` hai worker cùng kéo queue.

## P4 — Kỳ thi (M7)
- Việc: exams CRUD (hạng mục midterm/final) + publish snapshot câu hỏi + notify; sessions (BR9 shuffle, ends_at server); exam_answers autosave PUT; sweeper 10s auto-submit (MCQ chấm + code priority 10); đồng hồ thi lấy mốc từ REST và client đếm ngược; finish tay; monitor lecturer (poll 5s) + exam_events log; UI phòng thi (đề + editor + countdown + autosave indicator), màn hình monitor.
- Xong khi: tắt tab không nộp → hết giờ sweeper tự nộp; reconnect lấy lại bài nháp; countdown 2 client đồng bộ theo server.

## P5 — Hoàn thiện
- Việc: admin stats + audit viewer + settings UI; CSV gradebook; run thử; test suite JUnit cho service chính (auth, policies, grading score, exam sweeper); README chạy demo + kịch bản; hardening nho nhỏ (rate limit, truncate log).
- Xong khi: demo script chạy trọn không sửa code.

## Kịch bản demo (chuẩn bị từ P5, dùng suốt)
1. Admin import CSV sinh viên → gán vào lớp (P1).
2. Lecturer upload học liệu, tạo quiz → sinh viên làm → điểm hiện (P2).
3. Lecturer tạo bài code + test công khai/ẩn → sinh viên code trong Monaco → Run thử → Submit → Flower/RabbitMQ UI thấy message → kết quả từng test + điểm hiện **live** (P3).
4. `--scale worker=3` trước giờ thi → mở kỳ thi → 2 sinh viên thi cùng lúc, countdown server, autosave, hết giờ auto-submit, code thi ưu tiên chấm trước (P4).
5. Lecturer mở gradebook, điều chỉnh điểm (có audit) → admin xem audit log + stats (P5).

## Kiến thức nạp thêm theo phase (mục tiêu học tập)
- P0: monorepo, compose multi-service, health check, env config — mở rộng từ Docker đã biết.
- P1: **Java + Spring Boot + Spring Data JPA + Flyway + Spring Security/JWT** (mới chính), RBAC pattern.
- P2: modeling nghiệp vụ phức tạp, transaction, formula-driven gradebook.
- P3: **RabbitMQ (Spring AMQP, ack/DLQ/priority), Docker client, sandboxing, consumer worker** (mới chính), thiết kế giao thức WS.
- P4: server-authoritative time, background scheduler, xử lý reconnect/autosave, concurrent sessions.
- P5: JUnit, observability cơ bản.

## Rủi ro & giảm thiểu
| Rủi ro | Giảm thiểu |
|---|---|
| Docker Desktop (Windows) chậm/không có khi demo | Chuẩn bị sớm máy demo; fallback WSL2; test compose từ P0 |
| Sandbox bug (container treo, output lớn) | Wall timeout + kill bắt buộc; truncate output; giới hạn số test/bài |
| Chậm tiến độ P3 (phức nhất) | Book P3 sớm; cắt Run thử + verify đề nếu cần |
| Mất dữ liệu demo | Seed script tái tạo mọi thứ; mysqldump trước buổi demo |

## Câu hỏi mở
1. Deadline thật + solo/nhóm → cần rút Should nào?

*(Đã chốt 2026-10-20: ngôn ngữ chấm v1 = Python, C, C++, Java — effort chỉ là config `languages.py` + smoke test mỗi ngôn ngữ ở P3.)*
## Tình trạng chuyển stack (2026-10-23)

Chủ dự án đã chọn React SPA + Spring Boot. Web đã chuyển route sang React Router + Vite và chia màn hình theo feature; admin có trang tra cứu nhật ký kiểm toán. Java API hiện có health, auth (đăng nhập bằng **email hoặc mã SV**), quản trị user (kể cả import CSV), khóa học/lớp/ghi danh, học liệu, thông báo và ghi/xem audit log; worker nhận và kiểm tra message chấm bài. Nền kiểm thử JUnit đã dựng (MockMvc + H2, 30 test: auth/throttle, RBAC & ghi danh, chính sách học liệu). Quiz/sổ điểm, chấm code thực thi sandbox và kỳ thi chưa có nên là các phase phát triển LMS tiếp theo. Wave 2.5 backend đã hoàn tất (nhánh feat/profile-enrollment-and-list-ux): avatar/phone FR-AUTH-03, sĩ số + khóa lớp BR11–12 (CLASS_FULL), ghi danh 1 chiều theo mã SV/email, search/sort mọi danh sách FR-CRS-04, lịch học theo buổi + lặp tuần + /me/schedule FR-CRS-05..07 — 71 test JUnit xanh.
