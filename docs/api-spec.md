# Đặc tả API — LMS REST + WebSocket

| | |
|---|---|
| Phiên bản | 1.2 — 2026-10-23 |
| Base URL | `/api/v1` (OpenAPI tự sinh tại `/docs` — tài liệu sống) |
| Nguồn FR | `srs.md` |

## 1. Quy ước chung

- **Auth:** header `Authorization: Bearer <access_token>` (trừ login/refresh). WS: `GET /ws?token=...`.
- **Format:** JSON, UTF-8. Datetime ISO 8601 UTC.
- **Phân trang:** `?page=1&limit=20` → response `{items, total, page, limit}`. Limit max 100.
- **Search/sort (mọi route list):** `?q=` (search theo trường nghiệp vụ của từng resource — ghi rõ ở route), `?sort=field` / `?sort=-field` (tiền tố `-` = giảm dần; chỉ các trường cho phép của từng resource). Server whitelist trường sort, sai tên → 400 `VALIDATION_ERROR`.
- **Envelope lỗi thống nhất:**
```json
{ "error": { "code": "ENROLLMENT_REQUIRED", "message": "Bạn không thuộc lớp này", "details": {} } }
```
- **Mã lỗi nghiệp vụ** (tập trung ở core/exceptions): `UNAUTHENTICATED`, `FORBIDDEN`, `ENROLLMENT_REQUIRED`, `ATTEMPT_EXCEEDED`, `DEADLINE_PASSED`, `EXAM_NOT_OPEN`, `SESSION_ENDED`, `IDEMPOTENCY_CONFLICT`, `VALIDATION_ERROR`, `NOT_FOUND`, `RATE_LIMITED`, `INTERNAL`, `CLASS_FULL` (hết chỗ), `ALREADY_ENROLLED` (đã ghi danh lớp), `ENROLLMENT_INVALID` (mã SV/email không hợp lệ khi thêm tay).
- **HTTP语义:** 200/201 thành công; 202 nộp bài bất đồng bộ; 400 validate; 401/403 auth; 404; 409 xung đột nghiệp vụ; 423 khóa (đang chấm); 429 rate limit.
- **Idempotency:** POST nộp bài kèm header `Idempotency-Key: <uuid>`; trùng key → trả submission hoặc lượt quiz gốc (200), không tăng số lượt.

## 2. Auth & Users (M1)

| Method | Path | Role | Mô tả |
|---|---|---|---|
| POST | /auth/login | pub | Đăng nhập → `{access_token, refresh_token, user}`; 429 nếu khóa tạm |
| POST | /auth/refresh | pub | Rotate cặp token |
| POST | /auth/logout | auth | Revoke refresh hiện tại (body tùy chọn: có `{refresh_token}` → revoke 1 token; không body → revoke toàn bộ session) |
| GET | /auth/me | auth | Profile + roles (kèm `avatar_url` nếu có) |
| PATCH | /users/me | auth | Sửa họ tên / SĐT (`full_name`, `phone`); đổi mật khẩu (`old_password`, `new_password` — revoke các session khác) |
| POST | /users/me/avatar | auth | Upload ảnh đại diện (multipart, jpg/png/webp ≤2MB) → `{user}`; xóa avatar: DELETE |
| DELETE | /users/me/avatar | auth | Xóa ảnh đại diện → `{user}` |
| GET | /users/{id}/avatar | auth | Serve file avatar (stream; 404 nếu chưa có) |
| GET | /users | admin | List: `q` (tên/email/mã SV), filter `role`, `status`, sort (`full_name`, `created_at`, `last_login_at`) + phân trang |
| POST | /users | admin | Tạo user (`role_names`) → `{user, temporary_password}` |
| POST | /users/import/preview | admin | Validate CSV KHÔNG commit → `{valid_rows, errors: [{row, reason}], duplicates: [{row, email}]}` |
| POST | /users/import | admin | Import CSV (email, họ tên, mã SV, role) → `{created, skipped: [email], errors: [{row, reason}], temp_passwords}` |
| GET | /users/export | admin | Xuất CSV danh sách user (theo filter hiện tại) |
| GET | /users/{id} | admin | Chi tiết: user + roles + (SV: enrollments; GV: classes đang dạy) |
| PATCH | /users/{id} | admin | Sửa (`role_names`, status: khóa kèm `lock_reason` → audit + revoke toàn bộ refresh; reset mật khẩu → `{user, temporary_password}`; reset/đổi pw revoke refresh) |
| POST | /users/{id}/revoke-sessions | admin | Ép đăng xuất user (revoke toàn bộ refresh token) → audit |

## 3. Courses / Classes / Enrollment (M2)

| Method | Path | Role | Mô tả |
|---|---|---|---|
| GET/POST | /courses | lec/adm | List (`q` search mã/tên, sort `code`,`name`,`created_at`) / tạo khóa học |
| GET/PATCH/DELETE | /courses/{id} | lec/adm | Chi tiết / sửa / xóa |
| GET/POST | /classes | lec/adm | List (`q`, filter `course_id`, `semester`, sort `code`,`name`,`created_at`) / tạo lớp (`course_id`, `lecturer_id`, `co_lecturer_id?`, `max_students`, `room`, `status`) |
| GET/PATCH/DELETE | /classes/{id} | lec/adm | Chi tiết (kèm `enrolled_count`, `seats_left`) / sửa / xóa. Validate BR12: max_students ≥ sĩ số hiện tại |
| GET | /admin/classes | adm | Mọi lớp (search/filter như trên) — admin xem + override sĩ số/khóa lớp |
| PATCH | /admin/classes/{id} | adm | Override `max_students`, `status` → audit (BR12) |
| POST | /classes/{id}/enrollments | lec/adm | Thêm SV theo **mã SV hoặc email**: lẻ `{student_code \| email}` hoặc bulk `{students: [{student_code}]}` → validate từng dòng, trả `errors: [{row, reason}]` (`ENROLLMENT_INVALID`/`ALREADY_ENROLLED`/`CLASS_FULL`) — BR11 |
| DELETE | /classes/{id}/enrollments/{studentId} | lec/adm | Hủy ghi danh (enrollment → `dropped`, giữ lịch sử) |
| GET | /classes/{id}/students | lec/adm | Danh sách SV lớp: `q` (tên/email/mã SV), sort (`full_name`, `student_code`, `enrolled_at`) + phân trang |
| GET | /me/classes | student | Lớp đã ghi danh (`q`, sort) (Page envelope) + tiến độ |
| GET/POST | /classes/{id}/sessions | mem(list) / lec | Buổi học của lớp (filter `from`,`to`) / tạo buổi lẻ hoặc **lặp tuần** `{weekday, period_start, period_end, room?, mode?, delivery?, title?, repeat_from, repeat_weeks}` (FR-CRS-05) |
| PATCH/DELETE | /classes/{id}/sessions/{sessionId} | lec/adm | Sửa / xóa buổi **chưa diễn ra** |
| GET | /me/schedule | student | Lịch tuần của tôi: gộp buổi học mọi lớp đang ghi danh (`from`, `to`) (FR-CRS-06); lecturer dùng `/me/teaching-schedule` tương tự |

## 4. Materials (M3)

| Method | Path | Role | Mô tả |
|---|---|---|---|
| GET/POST | /classes/{id}/materials | mem / lec | List (`q` search tiêu đề, sort `title`,`created_at`,`size_bytes` + phân trang) / upload (multipart, ≤ max_upload_mb) hoặc link |
| GET | /materials/{id}/download | mem | Tải (stream, check enrollment) |
| PATCH/DELETE | /materials/{id} | lec | Sửa metadata / xóa |

## 5. Question Bank (M4)

| Method | Path | Role | Mô tả |
|---|---|---|---|
| GET/POST | /questions | lec | List (`q` search, filter `type`/`topic`/`difficulty`/`folder_id`/`tag`, include thùng rác) / tạo (MCQ, true_false, short_answer kèm options/answers, code kèm limits); trả version hiện hành |
| GET/PATCH/DELETE | /questions/{id} | owner/adm | Chi tiết / sửa (tạo nội dung phiên bản mới) / soft-delete; các bản đã publish giữ snapshot cũ |
| PUT | /questions/{id}/test-cases | owner | Thay toàn bộ test cases (input, expected, is_public, weight), tạo revision cho lần publish kế tiếp |
| POST | /questions/{id}/verify | owner | Chạy thử solution mẫu → kết quả từng test |
| GET/POST | /question-folders | lec | Cây folder của tôi (đa cấp) / tạo `{parent_id?, name}` |
| PATCH/DELETE | /question-folders/{id} | owner/adm | Đổi tên / di chuyển (`parent_id`) / xóa (chỉ khi rỗng) |
| POST | /questions/{id}/duplicate | owner | Nhân bản câu (bản mới nháp, tùy `{folder_id}`) |
| POST | /questions/{id}/restore | owner/adm | Khôi phục từ thùng rác |
| GET | /questions/{id}/usage | owner | Số assessment đang dùng câu + danh sách |
| POST | /questions/import | lec | Import CSV/Excel MCQ (template, validate từng dòng, trả errors theo dòng) |
| GET | /questions/export | lec | Export CSV theo filter hiện tại |
| POST/DELETE | /questions/{id}/image | owner | Upload/xóa ảnh câu hỏi (multipart jpg/png/webp ≤2MB) |
| GET | /questions/{id}/image | auth | Serve ảnh câu hỏi (đề đã publish: qua tham chiếu snapshot của assignment) |

## 6. Assignments & Submissions (M5/M6)

| Method | Path | Role | Mô tả |
|---|---|---|---|
| GET/POST | /classes/{id}/assignments | mem / lec | List (kèm trạng thái của tôi) / tạo |
| GET/PATCH/DELETE | /assignments/{id} | mem / lec | Chi tiết (câu hỏi + điểm; test ẩn ẩn) / sửa / xóa |
| POST | /assignments/{id}/publish | lec | Xuất bản + ghim snapshot phiên bản câu hỏi/điểm/thứ tự + notify lớp; assessment đã publish không sửa trực tiếp |
| POST | /assignments/{id}/questions:random | lec | Thêm N câu random theo `{filter: {folder_id?, topic?, difficulty?}, count, points}` (FR-ASM-02) — trả danh sách câu đã chọn; bản nháp vẫn sửa/xóa được trước publish |
| GET | /assignments/{id}/preview | lec | Đề render như SV thấy + tổng điểm (FR-ASM-04) |
| GET/POST/PATCH/DELETE | /assignments/{id}/sections | lec | Đề theo section (FR-ASM-03): `{title, filter, pick_count, points_each, position}` |
| GET/POST | /assignments/{id}/quiz-attempts | student | Chỉ `category=quiz`: GET lịch sử lượt của tôi; POST nộp cả bài `{answers: [{question_id, selected_option_ids}]}` + Idempotency-Key → chấm MCQ đồng bộ, trả `{attempt_id, attempt_no, score, question_scores}`. Câu không có trong `answers` = bỏ trống, 0 điểm; câu lạ/trùng bị từ chối; một POST chỉ tính một lượt |
| POST | /assignments/{id}/questions/{qid}/submissions | student | Chỉ bài **không phải quiz**: nộp từng câu (mcq: `{selected_option_ids}`; code: `{language, source_code}`) + Idempotency-Key. `max_attempts` và best/last tính riêng cho câu; MCQ chấm đồng bộ, code 202 |
| POST | /assignments/{id}/questions/{qid}/run | student | Run thử test công khai → 202 (priority thấp, không tính lượt, không điểm) |
| GET | /submissions/{id} | owner/lec | Trạng thái + kết quả (BR4: test ẩn chỉ pass/fail) |
| GET | /me/submissions?assignment_id= | student | Lịch sử nộp từng câu; lịch sử quiz theo `/assignments/{id}/quiz-attempts` |
| GET | /assignments/{id}/submissions | lec | Toàn bộ bài nộp (filter student/question/status) |
| POST | /submissions/{id}/regrade | lec | Chấm lại (BR8) → 202 |

## 7. Exams (M7)

| Method | Path | Role | Mô tả |
|---|---|---|---|
| GET/POST | /classes/{id}/exams | mem(list) / lec | List / tạo (đề, `grade_category=midterm\|final`, duration, opens/closes, rules, shuffle) |
| GET/PATCH | /exams/{id} | mem / lec | Chi tiết (chưa publish: chỉ metadata) / sửa nháp / publish; publish ghim snapshot phiên bản câu hỏi/điểm/thứ tự; exam đã publish không sửa trực tiếp |
| POST | /exams/{id}/sessions | student | Bắt đầu phiên: check khung giờ + enrollment `active` + xác nhận quy chế → session + đề theo snapshot đã publish (BR9) |
| GET | /exam-sessions/{id} | owner | Trạng thái + `remaining_seconds` + đề + đáp án đã lưu |
| PUT | /exam-sessions/{id}/answers | owner | Autosave upsert `{question_id, selected_option_ids?, code_text?}` |
| POST | /exam-sessions/{id}/finish | owner | Nộp: MCQ chấm, code → queue priority 10; sau ends_at → 409 SESSION_ENDED |
| GET | /exams/{id}/sessions | lec | Monitor: danh sách phiên + trạng thái + thời gian còn lại (poll 5s) |
| GET | /exams/{id}/results | lec | Kết quả theo thí sinh |

## 8. Gradebook (M8)

| Method | Path | Role | Mô tả |
|---|---|---|---|
| GET/PUT | /classes/{id}/grade-policy | lec | Xem / đặt trọng số hạng mục (validate Σ=100%) |
| GET | /classes/{id}/gradebook | lec | Bảng điểm (student × assessment gồm assignment + exam + trạng thái từng điểm/tổng + adjustments); tổng chỉ chốt theo FR-GB-02 khi mọi assessment đã publish hết cửa sổ nộp và chấm xong |
| GET | /classes/{id}/gradebook/export | lec | CSV |
| GET | /me/classes/{id}/grades | student | Điểm cá nhân lớp, điểm từng assessment và trạng thái tổng (`pending`/đã chốt) |
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
- WebSocket chỉ gửi trạng thái/kết quả chấm bài (client chỉ `ping`); state resume bằng REST sau reconnect.
- Catalog event + payload: xem `message-contracts.md` §3.
- Đồng hồ thi lấy mốc thời gian từ REST/session; client tự đếm ngược và đồng bộ lại qua REST, không dùng WebSocket.
