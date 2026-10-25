# Kiến trúc hệ thống — LMS

| | |
|---|---|
| Phiên bản | 2.2 — 2026-10-25 |
| Nguồn | `srs.md`, quyết định chuyển stack của chủ dự án |
| Nguyên tắc | Modular monolith; ưu tiên dễ hiểu, dễ demo và có thể mở rộng khi cần |

## 1. Nguyên tắc
1. API nghiệp vụ tách khỏi worker chấm bài; không chạy code sinh viên trong tiến trình API.
2. Nộp bài lập trình qua RabbitMQ; API trả `202 + submission_id`.
3. API stateless với JWT; quyền được kiểm tra ở backend.
4. Máy chủ là nguồn sự thật cho thời gian thi, trạng thái chấm và điểm.
5. WebSocket chỉ phục vụ cập nhật trạng thái/kết quả chấm bài. Dữ liệu chính được đọc lại qua REST.
6. Thay đổi schema phải qua Flyway migration; không sửa CSDL bằng tay.

## 2. Kiến trúc tổng thể

```
[React + TypeScript SPA]
        │ HTTPS REST /api/v1       │ WSS /ws (grading only)
        ▼                          ▼
[nginx — profile prod]
        ▼
[Spring Boot API — REST, WS, scheduled exam sweeper]
   ├── MySQL 8.4 (Spring Data JPA + Flyway)
   ├── RabbitMQ ── grading.submit ──▶ [Spring/Java grading worker ×N]
   │                                      │ Docker sandbox one-shot
   │                 ◀── grading.events ──┘
   └── local storage volume (qua StorageService)
```

## 3. Công nghệ và trách nhiệm
| Thành phần | Công nghệ | Trách nhiệm |
|---|---|---|
| Web | React, TypeScript, Vite, React Router, TanStack Query, Tailwind, Monaco | UI cho student/lecturer/admin; REST; WS chỉ nhận tiến độ chấm |
| API | Java 21, Spring Boot, Spring Web, Validation, Security, Data JPA, Flyway, Spring AMQP | REST `/api/v1`; auth/RBAC; nghiệp vụ; WS hub; sweeper kỳ thi |
| Worker | Java 21, Spring AMQP, Docker Java client | Nhận tác vụ, SELECT code/snapshot đã ghim, điều phối sandbox và publish kết quả; API ghi DB |
| Sandbox | Docker container dùng một lần | Chạy code không mạng, giới hạn tài nguyên và thời gian |
| Database | MySQL 8.4 InnoDB | Dữ liệu giao dịch; schema do Flyway quản lý |
| Broker | RabbitMQ 3.13 | Queue chấm bài, event hoàn tất, retry và DLQ |
| Proxy | nginx (compose profile `prod`) | Reverse proxy REST, WebSocket và static SPA |

## 4. Backend — cấu trúc package

```
apps/api/src/main/java/vn/lmsp/
├─ common/       # envelope lỗi, exception, pagination, audit, tiện ích dùng chung
├─ config/       # Spring, CORS, JPA, AMQP, WebSocket, OpenAPI
├─ controller/   # REST controllers; endpoint giữ hợp đồng /api/v1
├─ dto/          # request/response DTO, không trả entity trực tiếp
├─ enums/        # trạng thái và loại nghiệp vụ
├─ feature/      # thành phần nghiệp vụ khác khi cần tách theo miền
├─ mapper/       # chuyển entity ↔ DTO
├─ model/        # JPA entities
├─ repository/   # Spring Data repositories
├─ security/     # JWT filter, principal, password encoder, authorization
├─ service/      # nghiệp vụ, BR, transaction và audit
└─ LmsApplication.java
```

Tất cả REST controller nằm trong package `controller/`; tất cả service nghiệp vụ nằm trong package `service/`. Controller xác thực đầu vào và quyền; service áp dụng nghiệp vụ; repository truy cập dữ liệu. Entity không được lộ thành API response. Giữ file ngắn, tách theo trách nhiệm.

### Quy ước mapping và truy vấn dữ liệu

- DTO chỉ khai báo cấu trúc request/response và validation; không phụ thuộc JPA entity hoặc tự chuyển đổi entity.
- Mọi chuyển đổi entity sang DTO đặt trong các lớp `*Mapper` thuộc package `mapper`, đăng ký bằng `@Component` và dùng constructor injection.
- Mapper nhận đủ dữ liệu qua tham số, không inject repository/service, không ghi database và không kiểm tra quyền truy cập. Giữ nguyên tên trường JSON theo hợp đồng API.
- Service kiểm tra quyền, đọc dữ liệu và thực thi transaction trước khi gọi mapper. Với câu hỏi/bài tập nhiều bảng, `QuestionReadService` và `AssignmentReadService` gom dữ liệu; `QuestionVersionService` lưu/đọc snapshot phiên bản.
- Khi xuất response cho sinh viên, service truyền chế độ hiển thị phù hợp; mapper chỉ chiếu các trường được phép: không có đáp án đúng, solution mẫu hoặc test case ẩn. Snapshot nội bộ vẫn giữ đầy đủ dữ liệu để chấm bài.
- Query lấy câu hỏi của một bài tập được dùng chung cho summary và details trong một lần đọc. Bài đã xuất bản luôn đọc phiên bản ghim, bản nháp mới dùng phiên bản câu hỏi hiện tại.
- DTO kết quả nghiệp vụ như số dòng import hợp lệ, lỗi CSV, phân trang và kết quả thu hồi phiên được tạo tại service; chúng không phải mapping entity.
- Kiểm thử Java bảo vệ hợp đồng response, dữ liệu nhạy cảm, snapshot và chấm quiz; Docker build API chạy Maven test trước khi đóng gói.

Worker là ứng dụng Spring Boot riêng tại `apps/worker`, để scale độc lập. Khi grading được triển khai, consumer dùng manual ack, retry có giới hạn, DLQ và xử lý idempotent theo submission/attempt.

## 5. Frontend — React SPA theo feature

```
apps/web/src/
├─ app/           # router, providers, cấu hình khởi tạo
├─ components/    # UI dùng chung, layout, bảng, dialog
├─ features/      # auth, users, courses, classes, materials, notifications,
│                 # assignments, exams, gradebook; mỗi feature có api/components/hooks/types
├─ lib/           # HTTP client, WebSocket client, formatters, tiện ích
├─ pages/         # route-level composition, không chứa logic nghiệp vụ lớn
├─ styles/        # tokens và global styles
└─ types/         # kiểu dùng chung
```

Feature sở hữu API client và UI nghiệp vụ riêng; `components/` chỉ chứa thành phần thực sự dùng chung. Mọi request qua một HTTP client xử lý JWT refresh/error; query cache qua TanStack Query. Route guard chỉ hỗ trợ UX, backend vẫn kiểm tra quyền.

## 6. Hợp đồng API và realtime
- REST base `/api/v1`; giữ request/response và error envelope theo `api-spec.md`.
- WebSocket `/ws`: xác thực khi bắt tay, chỉ push sự kiện trạng thái/kết quả grading tới đúng user.
- WebSocket không thay thế REST cho notification, dashboard, đồng hồ thi hoặc autosave. Client reconnect thì refetch trạng thái qua REST.
- RabbitMQ mang tác vụ chấm và event worker → API. Worker không gọi browser/client.

## 7. Thi và chấm bài
- Spring scheduled task chạy mỗi 10 giây tìm session quá hạn; cập nhật/nộp tự động theo transaction và hợp đồng message.
- API lưu submission pending rồi publish queue; worker xử lý theo snapshot phiên bản câu hỏi đã ghim.
- M6 phần 1: submission và grading_jobs outbox được lưu cùng transaction, publisher confirm + retry; worker trả event V2 qua grading.events. API khóa submission, kiểm tra kết quả/tính điểm, ghi grading_results/test_results/notification rồi phát WS sau commit. Listener worker mẫu tắt cho đến khi phần 2 có sandbox; Run/regrade chưa triển khai.
- Sandbox: no-network, read-only root, tmpfs giới hạn, non-root, CPU/RAM/PID/time/output caps.
- Queue ưu tiên thi > bài tập > run thử; worker có thể scale riêng.

## 8. Triển khai
- Dev: `docker compose up --build` chạy MySQL, RabbitMQ, API, worker và web.
- Flyway chạy khi API khởi động; seed dữ liệu bằng ứng dụng/script seed tương thích Java.
- Prod-like: `docker compose --profile prod up --build` dùng nginx.
- Health: `GET /health` kiểm tra DB và AMQP; queue depth là endpoint vận hành riêng.

## 9. Đường mở rộng (không xây v1)
| Nhu cầu | Hướng mở rộng |
|---|---|
| Nhiều API instance và WS | Redis pub/sub hoặc gateway WS |
| Tệp lớn | thay storage local bằng S3/MinIO qua `StorageService` |
| Báo cáo nặng | MySQL read replica |
| Queue tải cao | autoscale worker theo queue depth |
