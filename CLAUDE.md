# CLAUDE.md — LMS-P (Môn Lập trình mạng)

LMS Client/Server: React + Spring Boot + MySQL + RabbitMQ. **Spec-first** — đối chiếu `docs/`, sửa spec trước khi thay đổi yêu cầu/hành vi.

## Đọc trước khi làm
1. `docs/srs.md` — yêu cầu chức năng M1–M10, BR1–BR10
2. `docs/system-architecture.md` — kiến trúc và cấu trúc thư mục
3. `docs/database-design.md`, `docs/api-spec.md`, `docs/message-contracts.md`, `docs/tech-decisions.md`
4. `docs/development-roadmap.md`

## Cấu trúc repo
```
apps/api      # Spring Boot REST /api/v1, WebSocket tín hiệu realtime
apps/web      # React + TypeScript + Vite SPA, chia theo features
apps/worker   # Spring Boot RabbitMQ consumer + Docker sandbox grader
infra/        # docker-compose.yml, nginx/
scripts/      # seed và tiện ích dev
storage/      # volume học liệu (gitignored)
docs/         # specs — nguồn chân lý
```

## Quy tắc bắt buộc

### Database
- Schema quản lý bằng JPA entities và **Flyway migrations**. Mỗi thay đổi schema cần migration versioned, review được.
- **Cấm** sửa schema trực tiếp trong MySQL hoặc sửa migration đã dùng; tạo migration mới.
- Thao tác nhạy cảm ghi `audit_logs`.

### Git
- Nhánh mô tả tính năng: `feat/<tinh-nang>`, `fix/<loi>`, `chore/<viec>`.
- Conventional commits có scope (`feat(api):`, `feat(web):`, `feat(worker):`, `docs:`...).
- Không commit `.env`, secret, credentials, nội dung `storage/`, dump DB.

### Code
- File < 200 dòng; tách theo trách nhiệm.
- Backend: controller → service → repository; validate request bằng Jakarta Validation; lỗi theo envelope `api-spec.md` §1.
- Frontend chia theo feature; logic gọi API qua client dùng chung; TypeScript strict; UI tiếng Việt.
- Auth/RBAC bắt buộc ở backend service/security, không dựa vào ẩn nút UI.
- WebSocket chỉ đẩy **tín hiệu thay đổi** (chấm bài, chạy thử, thông báo, phiên thi — `message-contracts.md` §6); dữ liệu luôn đọc qua REST. Mọi màn dùng tín hiệu phải tự đọc lại REST khi kết nối lại và giữ polling chậm làm dự phòng.
- Chạy compile/build/test trước khi báo hoàn tất.
