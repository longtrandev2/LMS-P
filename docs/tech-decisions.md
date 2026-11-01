# Tech Decisions (ADR-lite) — LMS

| | |
|---|---|
| Phiên bản | 1.3 — 2026-10-23 |
| Nguyên tắc | YAGNI · KISS · DRY; đúng Subject; chọn phương án đơn giản nhất thỏa yêu cầu, ghi rõ đường lùi |

| # | Quyết định | Lý do | Phương án đã loại + lý do |
|---|---|---|---|
| TD-01 | **Modular monolith** (modules theo M1–M10, ranh giới router/service/repository) | Đúng tinh thần "future scalability" của đề mà không trả giá vận hành microservices ở quy mô môn học; tách service sau khi có số liệu (ưu tiên tách worker — đã tách sẵn) | Microservices từ đầu: quá tải vận hành, không ai dùng |
| TD-02 | **Java + Spring Boot, Spring Web, Spring Data JPA, Flyway, Spring Security** | Chủ dự án chọn Java/Spring Boot; framework thống nhất API, persistence, validation, security và OpenAPI theo chuẩn Java | FastAPI/Python: không còn phù hợp stack đã chọn |
| TD-03 | **Consumer RabbitMQ tự viết bằng Spring AMQP, KHÔNG Spring Cloud Stream** | Manual ack/retry/DLQ/priority dễ kiểm soát và thể hiện rõ mô hình messaging | Spring Cloud Stream: thêm abstraction không cần cho quy mô này |
| TD-04 | **1 queue `q.grading` với `x-max-priority`** thay vì nhiều queue theo loại | Đơn giản, vẫn đạt ưu tiên thi > bài > run thử; RabbitMQ chỉ ưu tiên khi có backlog — đủ dùng | 3 queue routing riêng: thêm topology + consumer phức tạp, lợi ích không rõ ở quy mô này |
| TD-05 | **Không Redis v1** — WS ConnectionManager in-process, rate limit in-memory | 1 instance API → Redis là thừa; đường mở rộng đã ghi trong system-architecture.md §11 | Redis pub/sub từ đầu: thêm 1 service + phụ thuộc cho bài toán chưa tồn tại |
| TD-06 | **Storage local volume qua `StorageService` abstraction** | Học liệu quy mô lớp; interface hóa để swap S3/MinIO sau mà không sửa caller | MinIO/S3 v1: thêm vận hành, YAGNI |
| TD-07 | **JWT access 15m + refresh rotate (hash trong DB)** | REST stateless (Subject: scalability), WS auth token được; revoke được refresh khi logout | Session cookie server-side: gây dính instance, mâu thuẫn stateless |
| TD-08 | **Sandbox = Docker container one-shot (docker-py)**: no network, mem/cpu/pids limit, read-only + tmpfs, non-root, wall timeout, output cap | Đủ an toàn + đúng "isolated environments" của Subject ở quy mô môn học; demo được trực quan | gVisor/Firecracker: overkill; nsjail/isolate: linux-only khó trên môi trường demo Windows |
| TD-09 | **Source code lưu MEDIUMTEXT trong MySQL** | Code bài nộp nhỏ (KB), giữ transaction đơn giản (submission + code cùng txn — không mất bài) | Object storage từ đầu: tách txn, thêm consistency phức tạp; đường mở rộng đã ghi |
| TD-10 | **Bảng `submissions` thống nhất MCQ + code; `assignment_attempts` gom lượt quiz** | 1 đường đọc kết quả từng câu; quiz nộp cả bài cần một khóa lượt để đếm `max_attempts` và chọn best/last trên tổng điểm, còn bài code nộp từng câu | 2 hệ submission song song: gradebook phải ghép 2 nguồn; đếm lượt quiz theo từng câu: sai nghĩa một lượt làm bài |
| TD-11 | **Worker truy cập MySQL trực tiếp, kết quả về API qua AMQP `events.ws`** | Worker stateless, dễ scale; API là nơi duy nhất nói chuyện với client; thuần messaging — đúng chất đề | Worker gọi HTTP internal vào API: ghép coupling + cần auth service-to-service |
| TD-12 | **Sweeper kỳ thi = Spring `@Scheduled` trong API (10s)** | 1 instance → không cần lock phân tán; đơn giản, demo được auto-submit tin cậy | Cron job riêng: thêm thành phần cho việc 1 scheduled task |
| TD-13 | **Monorepo + Docker Compose** (apps/api, apps/web, apps/worker, infra/) | 1 lệnh chạy toàn hệ; worker scale `--scale`; đúng demo Client/Server phân tầng | Đa repo: Races version, khó demo |
| TD-14 | **nginx chỉ trong compose profile `prod`** | Dev Vite/Spring Boot chạy trực tiếp cho đơn giản; nginx cho demo production-like + TLS | Bỏ nginx hẳn: mất hình reverse proxy của kiến trúc client/server chuẩn |
| TD-15 | **Question soft-delete, user khóa thay vì xóa** | Câu hỏi đã gắn vào bài thi cũ — xóa cứng phá lịch sử; FK RESTRICT giữ toàn vẹn | Hard delete: mồ hôi cascade + mất audit trail |
| TD-16 | **Seed script là sản phẩm chính thức** | Demo không setup tay; test tích hợp dùng chung fixture | — |
| TD-17 | **Snapshot phiên bản câu hỏi khi publish assessment** | Bài cũ luôn hiển thị và chấm theo nội dung/đáp án/test case đã giao; sửa ngân hàng không làm đổi kết quả lịch sử | Đọc câu hỏi/test case hiện hành khi chấm: kết quả có thể đổi sau khi giảng viên sửa đề |
