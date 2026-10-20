# Đặc tả API — LMS REST + WebSocket

| | |
|---|---|
| Phiên bản | 1.0 — 2026-10-20 |
| Base URL | `/api/v1` (OpenAPI tự sinh tại `/docs` — tài liệu sống) |
| Nguồn FR | `srs.md` |

## 1. Quy ước chung

- **Auth:** header `Authorization: Bearer <access_token>` (trừ login/refresh). WS: `GET /ws?token=...`.
- **Format:** JSON, UTF-8. Datetime ISO 8601 UTC.
- **Phân trang:** `?page=1&limit=20` → response `{items, total, page, limit}`. Limit max 100.
- **Envelope lỗi thống nhất:**
```json
{ "error": { "code": "ENROLLMENT_REQUIRED", "message": "Bạn không thuộc lớp này", "details": {} } }
```
- **Mã lỗi nghiệp vụ** (tập trung ở core/exceptions): `UNAUTHENTICATED`, `FORBIDDEN`, `ENROLLMENT_REQUIRED`, `ATTEMPT_EXCEEDED`, `DEADLINE_PASSED`, `EXAM_NOT_OPEN`, `SESSION_ENDED`, `IDEMPOTENCY_CONFLICT`, `VALIDATION_ERROR`, `NOT_FOUND`, `RATE_LIMITED`, `INTERNAL`.
- **HTTP语义:** 200/201 thành công; 202 nộp bài bất đồng bộ; 400 validate; 401/403 auth; 404; 409 xung đột nghiệp vụ; 423 khóa (đang chấm); 429 rate limit.
- **Idempotency:** POST nộp bài kèm header `Idempotency-Key: <uuid>`; trùng key → trả submission gốc (200).

## 2. Auth & Users (M1)

| Method | Path | Role | Mô tả |
|---|---|---|---|
| POST | /auth/login | pub | Đăng nhập → `{access_token, refresh_token, user}`; 429 nếu khóa tạm |
| POST | /auth/refresh | pub | Rotate cặp token |
| POST | /auth/logout | auth | Revoke refresh hiện tại |
| GET | /auth/me | auth | Profile + roles |
| PATCH | /users/me | auth | Sửa tên / đổi mật khẩu |
| GET | /users | admin | List (filter role/status, phân trang) |
| POST | /users | admin | Tạo user (`role_names`) → `{user, temporary_password}` |
| POST | /users/import | admin | Import CSV (email, họ tên, mã SV, role) → `{created, skipped: [email], errors: [{row, reason}], temp_passwords}` |
| GET/PATCH | /users/{id} | admin | Xem / sửa (`role_names`, status, reset mật khẩu → `{user, temporary_password}`; reset/đổi pw revoke refresh) |

## 3. Courses / Classes / Enrollment (M2)

| Method | Path | Role | Mô tả |
|---|---|---|---|
| GET/POST | /courses | lec/adm | List / tạo khóa học |
| GET/PATCH/DELETE | /courses/{id} | lec/adm | Chi tiết / sửa / xóa |
| GET/POST | /classes | lec/adm | List (filter `?course_id=`) / tạo lớp (`course_id`, `lecturer_id`) |
| GET/PATCH/DELETE | /classes/{id} | lec/adm | Chi tiết / sửa / xóa |
| POST | /classes/{id}/enrollments | lec/adm | Ghi danh 1 hoặc bulk `[{student_id}]` |
| DELETE | /classes/{id}/enrollments/{studentId} | lec/adm | Hủy ghi danh |
| GET | /classes/{id}/students | lec/adm | Danh sách sinh viên lớp |
| GET | /me/classes | student | Lớp đã ghi danh (Page envelope) + tiến độ |

## 4. Materials (M3)

| Method | Path | Role | Mô tả |
|---|---|---|---|
| GET/POST | /classes/{id}/materials | mem / lec | List / upload (multipart, ≤ max_upload_mb) hoặc link |
| GET | /materials/{id}/download | mem | Tải (stream, check enrollment) |
| PATCH/DELETE | /materials/{id} | lec | Sửa metadata / xóa |

## 5. Question Bank (M4)

| Method | Path | Role | Mô tả |
|---|---|---|---|
| GET/POST | /questions | lec | List (filter type/topic/difficulty) / tạo (MCQ kèm options, code kèm limits) |
| GET/PATCH/DELETE | /questions/{id} | owner/adm | Chi tiết / sửa / soft-delete |
| PUT | /questions/{id}/test-cases | owner | Thay toàn bộ test cases (input, expected, is_public, weight) |
| POST | /questions/{id}/verify | owner | Chạy thử solution mẫu → kết quả từng test |

## 6. Assignments & Submissions (M5/M6)

| Method | Path | Role | Mô tả |
|---|---|---|---|
| GET/POST | /classes/{id}/assignments | mem / lec | List (kèm trạng thái của tôi) / tạo |
| GET/PATCH/DELETE | /assignments/{id} | mem / lec | Chi tiết (câu hỏi + điểm; test ẩn ẩn) / sửa / xóa |
| POST | /assignments/{id}/publish | lec | Xuất bản + notify lớp |
| POST | /assignments/{id}/questions/{qid}/submissions | student | **Nộp bài** (mcq: `{selected_option_ids}`; code: `{language, source_code}` + Idempotency-Key) → MCQ chấm đồng bộ; code 202 |
| POST | /assignments/{id}/questions/{qid}/run | student | Run thử test công khai → 202 (priority thấp, không tính lượt, không điểm) |
| GET | /submissions/{id} | owner/lec | Trạng thái + kết quả (BR4: test ẩn chỉ pass/fail) |
| GET | /me/submissions?assignment_id= | student | Lịch sử nộp của tôi |
| GET | /assignments/{id}/submissions | lec | Toàn bộ bài nộp (filter student/question/status) |
| POST | /submissions/{id}/regrade | lec | Chấm lại (BR8) → 202 |

## 7. Exams (M7)

| Method | Path | Role | Mô tả |
|---|---|---|---|
| GET/POST | /classes/{id}/exams | mem(list) / lec | List / tạo (đề, duration, opens/closes, rules, shuffle) |
| GET/PATCH | /exams/{id} | mem / lec | Chi tiết (chưa publish: chỉ metadata) / sửa / publish |
| POST | /exams/{id}/sessions | student | Bắt đầu phiên: check khung giờ + xác nhận quy chế → session + đề (BR9) |
| GET | /exam-sessions/{id} | owner | Trạng thái + `remaining_seconds` + đề + đáp án đã lưu |
| PUT | /exam-sessions/{id}/answers | owner | Autosave upsert `{question_id, selected_option_ids?, code_text?}` |
| POST | /exam-sessions/{id}/finish | owner | Nộp: MCQ chấm, code → queue priority 10; sau ends_at → 409 SESSION_ENDED |
| GET | /exams/{id}/sessions | lec | Monitor: danh sách phiên + trạng thái + thời gian còn lại (poll 5s) |
| GET | /exams/{id}/results | lec | Kết quả theo thí sinh |

## 8. Gradebook (M8)

| Method | Path | Role | Mô tả |
|---|---|---|---|
| GET/PUT | /classes/{id}/grade-policy | lec | Xem / đặt trọng số hạng mục (validate Σ=100%) |
| GET | /classes/{id}/gradebook | lec | Bảng điểm (student × assignment + tổng thang 10 + adjustments) |
| GET | /classes/{id}/gradebook/export | lec | CSV |
| GET | /me/classes/{id}/grades | student | Điểm cá nhân lớp |
| POST | /classes/{id}/grade-adjustments | lec | Điều chỉnh (points, reason) → audit |

## 9. Notifications / Admin (M9/M10)

| Method | Path | Role | Mô tả |
|---|---|---|---|
| GET | /notifications | auth | List (filter unread) |
| PATCH | /notifications/{id}/read · /notifications/read-all | auth | Đánh dấu đã đọc |
| GET/PUT | /admin/settings | adm | Cấu hình hệ thống (audit) |
| GET | /admin/audit-logs | adm | Lọc actor/action/entity/time, phân trang |
| GET | /admin/stats | adm | users/classes/submissions theo ngày, queue depth, avg grading latency |
| GET | /health · /health/queue | pub | Health check DB+AMQP · queue depth |

## 10. WebSocket

- Kết nối: `GET /ws?token=<access_token>` → server validate → connection gắn user_id.
- Server-push only (client chỉ `ping`); state resume bằng REST sau reconnect.
- Catalog event + payload: xem `message-contracts.md` §3.
- Clock thi: `exam.clock` mỗi 30s cho session đang mở + `exam.closing` cảnh báo 60s cuối.
