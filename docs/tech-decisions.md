# Tech Decisions (ADR-lite) — LMS

| | |
|---|---|
| Phiên bản | 1.0 — 2026-10-20 |
| Nguyên tắc | YAGNI · KISS · DRY; đúng Subject; chọn phương án đơn giản nhất thỏa yêu cầu, ghi rõ đường lùi |

| # | Quyết định | Lý do | Phương án đã loại + lý do |
|---|---|---|---|
| TD-01 | **Modular monolith** (modules theo M1–M10, ranh giới router/service/repository) | Đúng tinh thần "future scalability" của đề mà không trả giá vận hành microservices ở quy mô môn học; tách service sau khi có số liệu (ưu tiên tách worker — đã tách sẵn) | Microservices từ đầu: quá tải vận hành, không ai dùng |
| TD-02 | **FastAPI + SQLAlchemy 2 async + Alembic + Pydantic v2** | Subject yêu cầu Python; FastAPI async tự nhiên cho WS + publish AMQP; OpenAPI free (tài liệu sống) | Django/DRF: sync, WebSocket cần Channels phức tạp hơn; Flask: cần ghép nhiều mảnh |
| TD-03 | **Consumer tự viết (aio-pika), KHÔNG Celery** | Subject yêu cầu RabbitMQ phân phối tới worker — tự viết manual ack/retry/DLQ/priority thể hiện đúng hiểu biết messaging; ít phụ thuộc | Celery: giấu cơ chế queue, broker config thêm lớp, khó demo "submission queue" |
| TD-04 | **1 queue `q.grading` với `x-max-priority`** thay vì nhiều queue theo loại | Đơn giản, vẫn đạt ưu tiên thi > bài > run thử; RabbitMQ chỉ ưu tiên khi có backlog — đủ dùng | 3 queue routing riêng: thêm topology + consumer phức tạp, lợi ích không rõ ở quy mô này |
| TD-05 | **Không Redis v1** — WS ConnectionManager in-process, rate limit in-memory | 1 instance API → Redis là thừa; đường mở rộng đã ghi trong system-architecture.md §11 | Redis pub/sub từ đầu: thêm 1 service + phụ thuộc cho bài toán chưa tồn tại |
| TD-06 | **Storage local volume qua `StorageService` abstraction** | Học liệu quy mô lớp; interface hóa để swap S3/MinIO sau mà không sửa caller | MinIO/S3 v1: thêm vận hành, YAGNI |
| TD-07 | **JWT access 15m + refresh rotate (hash trong DB)** | REST stateless (Subject: scalability), WS auth token được; revoke được refresh khi logout | Session cookie server-side: gây dính instance, mâu thuẫn stateless |
| TD-08 | **Sandbox = Docker container one-shot (docker-py)**: no network, mem/cpu/pids limit, read-only + tmpfs, non-root, wall timeout, output cap | Đủ an toàn + đúng "isolated environments" của Subject ở quy mô môn học; demo được trực quan | gVisor/Firecracker: overkill; nsjail/isolate: linux-only khó trên môi trường demo Windows |
| TD-09 | **Source code lưu MEDIUMTEXT trong MySQL** | Code bài nộp nhỏ (KB), giữ transaction đơn giản (submission + code cùng txn — không mất bài) | Object storage từ đầu: tách txn, thêm consistency phức tạp; đường mở rộng đã ghi |
| TD-10 | **Bảng `submissions` thống nhất MCQ + code** | 1 đường đọc cho gradebook/lịch sử; MCQ completed ngay, code đi pipeline; cột nullable chấp nhận được | 2 hệ submission song song: DRY vi phạm, gradebook phải ghép 2 nguồn |
| TD-11 | **Worker truy cập MySQL trực tiếp, kết quả về API qua AMQP `events.ws`** | Worker stateless, dễ scale; API là nơi duy nhất nói chuyện với client; thuần messaging — đúng chất đề | Worker gọi HTTP internal vào API: ghép coupling + cần auth service-to-service |
| TD-12 | **Sweeper kỳ thi = asyncio task trong API (10s)** | 1 instance → không cần lock phân tán; đơn giản, demo được auto-submit tin cậy | Cron job riêng / Celery beat: thêm thành phần cho việc 1 dòng loop |
| TD-13 | **Monorepo + Docker Compose** (apps/api, apps/web, apps/worker, infra/) | 1 lệnh chạy toàn hệ; worker scale `--scale`; đúng demo Client/Server phân tầng | Đa repo: Races version, khó demo |
| TD-14 | **nginx chỉ trong compose profile `prod`** | Dev Next/FastAPI chạy trực tiếp cho đơn giản; nginx (đã thuộc) cho demo production-like + TLS | Bỏ nginx hẳn: mất hình reverse proxy của kiến trúc client/server chuẩn |
| TD-15 | **Question soft-delete, user khóa thay vì xóa** | Câu hỏi đã gắn vào bài thi cũ — xóa cứng phá lịch sử; FK RESTRICT giữ toàn vẹn | Hard delete: mồ hôi cascade + mất audit trail |
| TD-16 | **Seed script là sản phẩm chính thức** | Demo không setup tay; test tích hợp dùng chung fixture | — |
