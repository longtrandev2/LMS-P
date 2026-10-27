# LMS-P — Hệ thống quản lý học tập

Monorepo LMS dùng **React + TypeScript + Vite**, **Java 21 + Spring Boot**, MySQL 8.4 và RabbitMQ. Đã có: người dùng/lớp/học liệu, ngân hàng câu hỏi 9 loại (một/nhiều đáp án, đúng-sai, trả lời ngắn, đáp số, điền chỗ trống, ghép cặp, sắp xếp, lập trình), bài tập và quiz (trộn đề, chính sách xem lại, bốc đề ngẫu nhiên), chấm code trong Docker sandbox (checker, kết quả từng test, kiểm tra đề bằng lời giải mẫu, chạy thử, chấm lại), thông báo realtime và audit. Chưa có: kỳ thi (M7), sổ điểm (M8). Đặc tả câu hỏi/đề/chấm: [`docs/assessment-spec.md`](docs/assessment-spec.md). Mã Python cũ được giữ để đối chiếu.

## Cấu trúc

```
apps/api      Spring Boot — REST /api/v1, WebSocket grading
apps/web      React SPA — src/features/<feature>
apps/worker   Spring Boot consumer RabbitMQ
infra/        docker-compose.yml, nginx/
scripts/      seed và tiện ích dev (legacy Python seed sẽ được thay)
storage/      volume học liệu (gitignored)
```

## Chạy

Yêu cầu Docker Desktop, Node.js 20+, Java 21 và Maven 3.9+ nếu chạy ứng dụng ngoài Docker.

```powershell
# Chỉ sao chép khi chưa có infra\.env; thay các giá trị mẫu trước khi chạy.
Copy-Item infra\.env.example infra\.env
# Điền JWT_SECRET dài tối thiểu 32 ký tự vào infra\.env
Set-Location infra
docker compose up -d --build
docker compose logs api   # kiểm tra API khởi động
```

Web: http://localhost:3000 · API: http://localhost:8000 · Swagger: http://localhost:8000/swagger-ui/index.html · RabbitMQ: http://localhost:15672.

Tài khoản demo local: `lecturer@lms.local`, `student@lms.local`, `admin@lms.local` đều dùng mật khẩu `Demo@12345`. Đổi hoặc tắt tài khoản demo trước khi triển khai thật.

Dữ liệu demo (lớp, 3 sinh viên, ngân hàng 9 loại câu, quiz, bài code chuẩn CP kèm lượt nộp mẫu) — chạy khi stack đang lên, chạy lại không nhân bản:

```powershell
node scripts/seed-demo.mjs
```

Chạy riêng frontend từ `apps/web`: `npm ci`, đặt `VITE_API_URL=http://localhost:8000`, rồi `npm run dev`.

## Backend và kiểm thử

Controller nhận request; service kiểm tra quyền, xử lý nghiệp vụ và đọc/ghi repository; các lớp `*Mapper` trong `apps/api/src/main/java/vn/lmsp/mapper` chuyển dữ liệu đã tải thành DTO. Mapper không gọi repository, DTO không phụ thuộc entity. Xem [quy ước kiến trúc](docs/system-architecture.md#quy-ước-mapping-và-truy-vấn-dữ-liệu).

Với Java 21 và Maven 3.9+, chạy từ thư mục gốc:

```powershell
mvn -f apps/api/pom.xml test
mvn -f apps/worker/pom.xml test
```

Hoặc dùng Docker để build và chạy kiểm thử trong Maven container:

```powershell
docker compose --env-file infra/.env -f infra/docker-compose.yml build api worker
```

Các kiểm thử Java hiện bảo vệ trường dữ liệu trả về, dữ liệu nhạy cảm, phiên bản câu hỏi đã ghim, điểm quiz, phạt nộp muộn và idempotency. Kiểm thử tích hợp với MySQL/RabbitMQ và các tính năng chưa triển khai cần được bổ sung theo từng feature.

## Chấm code

Luồng: nộp bài → outbox → RabbitMQ `q.grading` → worker biên dịch và chạy test trong container sandbox (không mạng, giới hạn CPU/RAM/PID/thời gian/output) → event kết quả → API lưu verdict, kết quả từng test, điểm → WebSocket. Kiểm tra đề và chạy thử dùng queue `q.runs`. Hợp đồng: [`docs/message-contracts.md`](docs/message-contracts.md).

Kiểm tra API bằng DB/broker riêng và kết quả worker giả lập (Node.js 22+); chạy trong cùng một cửa sổ PowerShell, sau khi build image API:

```powershell
$env:GRADING_CHECK_PASSWORD = [Guid]::NewGuid().ToString('N')
$env:GRADING_CHECK_SECRET = [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')
docker compose -f infra/docker-compose.grading-check.yml up -d --wait
node scripts/check-grading-api.mjs
docker compose -f infra/docker-compose.grading-check.yml down -v
```

Stack `lms-grading-check` dùng API cổng 18000 và RabbitMQ Management 15673; volume kiểm tra riêng. Script kiểm tra request đồng thời, idempotency, quyền truy cập, trạng thái/điểm, test ẩn, WS đúng user, DLQ và giới hạn lượt. Các kiểm tra này xác nhận phần API, không xác nhận thực thi sandbox.

## Tài liệu

- [SRS](docs/srs.md) · [Kiến trúc](docs/system-architecture.md) · [Database](docs/database-design.md)
- [API](docs/api-spec.md) · [Message](docs/message-contracts.md) · [Tech decisions](docs/tech-decisions.md)
- [Roadmap](docs/development-roadmap.md)
