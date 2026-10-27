# LMS-P — Hệ thống quản lý học tập

Monorepo LMS dùng **React + TypeScript + Vite**, **Java 21 + Spring Boot**, MySQL 8.4 và RabbitMQ. Đã có: người dùng/lớp/học liệu, ngân hàng câu hỏi 9 loại (một/nhiều đáp án, đúng-sai, trả lời ngắn, đáp số, điền chỗ trống, ghép cặp, sắp xếp, lập trình), bài tập và quiz (trộn đề, chính sách xem lại, bốc đề ngẫu nhiên), chấm code trong Docker sandbox (checker, kết quả từng test, kiểm tra đề bằng lời giải mẫu, chạy thử, chấm lại), thông báo realtime và audit, lịch học/điểm danh/đơn xin nghỉ, sổ điểm 4 thành phần, kỳ thi (nhiều mã đề / đề riêng từng sinh viên, phòng thi có đồng hồ server, tự lưu, tự nộp, giám sát — [`docs/exam-spec.md`](docs/exam-spec.md)). quản trị & vận hành (cấu hình, bảo trì, dashboard thống kê, hàng đợi, thông báo hệ thống, phiên đăng nhập — [`docs/admin-spec.md`](docs/admin-spec.md)). Đủ 11 module theo SRS. Đặc tả câu hỏi/đề/chấm: [`docs/assessment-spec.md`](docs/assessment-spec.md).

## Cấu trúc

```
apps/api      Spring Boot — REST /api/v1, WebSocket grading
apps/web      React SPA — src/features/<feature>
apps/worker   Spring Boot consumer RabbitMQ
infra/        docker-compose.yml, nginx/
scripts/      seed demo, reset DB, smoke test
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

Dữ liệu demo: lớp, 3 sinh viên, ngân hàng 9 loại câu, quiz, bài code chuẩn CP, lịch học/điểm danh, sổ điểm, kỳ thi giữa kỳ (2 mã đề) và cuối kỳ (đề riêng), quiz 15 phút. Chạy khi stack đang lên; chạy lại không nhân bản:

```powershell
node scripts/seed-demo.mjs        # seed thêm vào DB hiện tại
node scripts/reset-demo.mjs --yes # XÓA volume local, dựng lại stack và seed từ đầu
node scripts/smoke-e2e.mjs        # kiểm tra nhanh kỳ thi + quản trị trên stack đang chạy
```

## Kịch bản demo

Nên chạy `reset-demo.mjs --yes` trước buổi demo để có trạng thái sạch. Mật khẩu chung `Demo@12345`.

1. **Giảng viên** (`lecturer@lms.local`) → lớp *Lập trình mạng — Lớp 1*:
   - Tab **Lịch học**: mở một buổi để điểm danh, xem thống kê.
   - Tab **Đơn xin nghỉ**: duyệt đơn đang chờ.
   - Tab **Kết quả học tập**: chỉnh trọng số, xem điểm hệ 10/4/chữ, xuất CSV.
2. Tab **Kỳ thi**:
   - Mở *Đề thi thử — ma trận (nháp)* → **Cấu trúc đề**: ma trận đề, các mã đề.
   - **Xem trước đề** → *Bốc lại*.
   - Mở *Kiểm tra giữa kỳ* → **Giám sát**: trạng thái từng sinh viên, mã đề, số lần rời trang, gia hạn/thu bài.
3. **Sinh viên** (`student@lms.local`) → tab **Kỳ thi** → *Kiểm tra giữa kỳ*:
   - Đọc quy chế → **Bắt đầu làm bài**.
   - Trong phòng thi: đồng hồ theo server, tự lưu (tắt mạng vẫn giữ bài), chuyển tab để thấy cảnh báo, chạy thử câu code, **Nộp bài**.
   - Song song, giảng viên xem cập nhật ở màn Giám sát.
4. **Bài code chuẩn CP** (tab **Bài tập**): nộp code sai/đúng để thấy verdict CE/WA/AC từng test qua WebSocket. Giảng viên xem bài nộp và **chấm lại**.
5. **Quản trị** (`admin@lms.local`):
   - **Tổng quan**: thống kê, độ trễ chấm, hàng đợi, người online.
   - **Cấu hình**: bật **bảo trì** → đăng nhập sinh viên thấy banner, không bắt đầu bài mới được → tắt bảo trì.
   - **Vận hành**: gửi thông báo hệ thống tới một lớp → sinh viên thấy ở chuông thông báo.
   - **Người dùng** → *Phiên đăng nhập*.
   - **Nhật ký kiểm toán**: mọi thao tác trên đều được ghi, có xuất CSV.

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

Kiểm thử Java là unit test (API 367, worker 44). Luồng end-to-end trên MySQL/RabbitMQ thật được kiểm bằng `scripts/smoke-e2e.mjs` (sau khi seed) và `scripts/check-grading-api.mjs`. Web: `npm run lint` (tsc + ESLint) và `npm run build`.

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
