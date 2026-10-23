# LMS-P — Hệ thống quản lý học tập

Monorepo LMS dùng **React + TypeScript + Vite**, **Java 21 + Spring Boot**, MySQL 8.4 và RabbitMQ. WebSocket dành cho tiến độ/kết quả chấm bài; các nghiệp vụ khác dùng REST. Backend Spring đã port các API health, xác thực, quản lý người dùng (gồm import CSV), khóa học/lớp/ghi danh, học liệu, thông báo và ghi/xem audit log. Kiểm thử tương đương và xác nhận build/integration còn thiếu; worker hiện xác thực message/ack như bản Python. Pipeline chấm sandbox chưa được triển khai trong bản Python cũ. Mã Python được giữ để đối chiếu trong giai đoạn chuyển đổi.

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
Copy-Item .env.example infra\.env
# Điền JWT_SECRET dài tối thiểu 32 ký tự vào infra\.env
Set-Location infra
docker compose up -d --build
docker compose logs api   # kiểm tra API khởi động
```

Web: http://localhost:3000 · API: http://localhost:8000 · Swagger: http://localhost:8000/swagger-ui/index.html · RabbitMQ: http://localhost:15672.

Tài khoản demo local: `lecturer@lms.local`, `student@lms.local`, `admin@lms.local` đều dùng mật khẩu `Demo@12345`. Đổi hoặc tắt tài khoản demo trước khi triển khai thật.

Chạy riêng frontend từ `apps/web`: `npm install`, đặt `VITE_API_URL=http://localhost:8000`, rồi `npm run dev`.

## Tài liệu

- [SRS](docs/srs.md) · [Kiến trúc](docs/system-architecture.md) · [Database](docs/database-design.md)
- [API](docs/api-spec.md) · [Message](docs/message-contracts.md) · [Tech decisions](docs/tech-decisions.md)
- [Roadmap](docs/development-roadmap.md)
