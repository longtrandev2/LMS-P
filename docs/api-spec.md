# Đặc tả API — LMS REST + WebSocket

| | |
|---|---|
| Phiên bản | 1.5 — 2026-10-27 (câu hỏi đa loại, xem lại, run jobs, chấm lại — chi tiết `assessment-spec.md`) |
| Base URL | `/api/v1` (Swagger UI `/swagger-ui/index.html`, OpenAPI `/v3/api-docs`) |
| Nguồn FR | `srs.md` |

## 1. Quy ước chung

- **Auth:** header `Authorization: Bearer <access_token>` (trừ login/refresh). WS: `GET /ws?token=...`.
- **Format:** JSON, UTF-8. Datetime ISO 8601 UTC. Assignment schedule fields (`available_from`, `due_at`, `late_due_at`) are UTC instants; because their Java DTO type is `LocalDateTime`, the API serializes them without a zone suffix and clients must interpret them as UTC. Convert browser-local `datetime-local` values to UTC before sending, and convert UTC values back to local time for display/editing.
- **Phân trang:** `?page=1&limit=20` → response `{items, total, page, limit}`. Limit max 100.
- **Search/sort (mọi route list):** `?q=` (search theo trường nghiệp vụ của từng resource — ghi rõ ở route), `?sort=field` / `?sort=-field` (tiền tố `-` = giảm dần; chỉ các trường cho phép của từng resource). Server whitelist trường sort, sai tên → 400 `VALIDATION_ERROR`.
- **Envelope lỗi thống nhất:**
```json
{ "error": { "code": "ENROLLMENT_REQUIRED", "message": "Bạn không thuộc lớp này", "details": {} } }
```
- **Mã lỗi nghiệp vụ** (tập trung ở core/exceptions): `UNAUTHENTICATED`, `FORBIDDEN`, `ENROLLMENT_REQUIRED`, `ATTEMPT_EXCEEDED`, `DEADLINE_PASSED`, `EXAM_NOT_OPEN`, `SESSION_ENDED`, `IDEMPOTENCY_CONFLICT`, `VALIDATION_ERROR`, `NOT_FOUND`, `RATE_LIMITED`, `INTERNAL`, `CLASS_FULL` (hết chỗ), `ENROLL_CLOSED` (ngoài khung giờ ghi danh), `ALREADY_ENROLLED` (đã ghi danh lớp), `ENROLLMENT_INVALID` (mã SV/email không hợp lệ khi thêm tay), `PROBLEM_CHECK_FAILED` (lời giải mẫu không AC trên phiên bản sắp ghim), `PROBLEM_UNVERIFIED` (câu lập trình chưa được kiểm tra đề; gửi lại với `confirm_unverified=true` để xác nhận).
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
| POST | /users/import/preview | admin | Validate CSV KHÔNG commit → `{valid_rows, errors: [{row, reason}], duplicates: [{row, email, student_code}]}`; phát hiện trùng trong DB và trong chính tệp |
| POST | /users/import | admin | Import CSV (email, họ tên, mã SV, role) → `{created, skipped: [email], errors: [{row, reason}], temp_passwords}` |
| GET | /users/export | admin | Xuất CSV danh sách user (theo filter hiện tại) |
| GET | /users/{id} | admin | Chi tiết: user + roles + (SV: enrollments; GV: classes đang dạy) |
| PATCH | /users/{id} | admin | Sửa (`role_names`, status: chuyển sang khóa phải có `lock_reason` → audit + revoke toàn bộ refresh; reset mật khẩu → `{user, temporary_password}`; reset/đổi pw revoke refresh) |
| POST | /users/{id}/revoke-sessions | admin | Ép đăng xuất user (revoke toàn bộ refresh token) → audit |

## 3. Courses / Classes / Enrollment (M2)

| Method | Path | Role | Mô tả |
|---|---|---|---|
| GET | /courses | lec/adm | Admin xem mọi học phần; lecturer chỉ xem học phần có lớp được phân công (`q` search mã/tên, sort `code`,`name`,`created_at`) |
| POST | /courses | adm | Tạo học phần |
| GET | /courses/{id} | lec/adm | Admin xem mọi học phần; lecturer chỉ xem học phần có lớp được phân công |
| PATCH/DELETE | /courses/{id} | adm | Sửa / xóa học phần |
| GET | /classes | lec/adm | Admin xem mọi lớp; lecturer chỉ xem lớp được phân công (`q`, filter `course_id`, `semester`, sort `code`,`name`,`created_at`) |
| POST | /classes | adm | Tạo lớp, chọn học phần và giảng viên phụ trách (`course_id`, `lecturer_id`, `max_students`, `enroll_from`, `enroll_until`, `room`, `schedule`) |
| GET | /classes/{id} | lec/adm | Chi tiết lớp; lecturer chỉ xem lớp được phân công |
| PATCH/DELETE | /classes/{id} | adm | Sửa / xóa lớp; phân công giảng viên tại đây. Validate BR12: max_students ≥ sĩ số hiện tại, enroll_until > enroll_from |
| GET | /admin/classes | adm | Mọi lớp (search/filter như trên) — admin xem + override sĩ số/khung giờ/khóa lớp |
| PATCH | /admin/classes/{id} | adm | Override `max_students` (bypass khi đầy), `enroll_from/until`, `status` → audit |
| POST | /classes/{id}/enrollments | lec/adm | Nhận `{student_ids: [id, ...]}` (1–500 id) để thêm SV đã chọn từ gợi ý tìm kiếm theo mã SV/tên/email. Lecturer chỉ thao tác lớp mình phụ trách; admin thao tác mọi lớp. Validate từng dòng, trả `{added, errors: [{row, code, reason}]}`. Lecturer thêm ngoài khung thời gian; chỉ admin vượt sĩ số |
| GET | /classes/{id}/student-candidates | lec/adm | Tìm SV active chưa thuộc lớp theo `q` (ít nhất 2 ký tự, tên/mã/email), có phân trang; lecturer chỉ trong lớp mình phụ trách |
| POST | /classes/{id}/enrollments/import/preview | lec/adm | Xem trước danh sách CSV đã đọc ở trình duyệt: `{students: [{row, student_code?, email?}]}`. Trả từng dòng gồm định danh, hồ sơ khớp, `valid`, `code`, `reason`; không ghi DB |
| POST | /classes/{id}/enrollments/import | lec/adm | Xác nhận cùng payload preview; backend kiểm tra lại quyền, tài khoản, trùng và sĩ số rồi thêm các dòng hợp lệ. Trả `{added, errors: [{row, code, reason}]}`; dòng lỗi không làm mất các dòng hợp lệ |
| DELETE | /classes/{id}/enrollments/{studentId} | lec/adm | Hủy ghi danh (enrollment → `dropped`, giữ lịch sử); lecturer chỉ trong lớp mình phụ trách |
| GET | /classes/{id}/students | lec/adm | Danh sách SV lớp: `q` (tên/email/mã SV), sort (`full_name`, `student_code`, `enrolled_at`) + phân trang; lecturer chỉ xem lớp mình phụ trách |
| GET | /me/classes | student | Lớp đã ghi danh (`q`, sort) (Page envelope) + tiến độ |

## 4. Materials (M3)

| Method | Path | Role | Mô tả |
|---|---|---|---|
| GET/POST | /classes/{id}/materials | mem / lec | List (`q` search tiêu đề, sort `title`,`created_at`,`size_bytes` + phân trang) / upload (multipart, ≤ max_upload_mb) hoặc link |
| GET | /materials/{id}/download | mem | Tải (stream, check enrollment) |
| PATCH/DELETE | /materials/{id} | lec | Sửa metadata / xóa |

## 5. Question Bank (M4)

| Method | Path | Role | Mô tả |
|---|---|---|---|
| GET/POST | /question-banks | lec/adm | GET list ngân hàng được phép xem, lọc `course_id` (vẫn trả ngân hàng cá nhân cũ của chính người dùng); POST lecturer tạo ngân hàng mới trong học phần được phân công bằng `{course_id,name,description?,visibility?:private|shared}`. Một học phần có thể có nhiều ngân hàng. Response có `can_edit`, `can_manage` |
| PATCH | /question-banks/{id}/visibility | owner/adm | Đổi `private`/`shared`; admin chỉ xử lý đặc biệt |
| GET/PUT/DELETE | /question-banks/{id}/permissions[/{lecturerId}] | owner/adm | Xem, cấp `{permission:view|edit}`, thu hồi quyền giảng viên cùng học phần |
| GET | /question-banks/{id}/eligible-lecturers | owner/adm | Danh sách giảng viên đang được phân công vào học phần để cấp quyền |
| GET/POST | /question-banks/{id}/categories | bank viewer/editor | Xem danh mục; chỉ lecturer có quyền sửa ngân hàng được tạo |
| PATCH/DELETE | /question-categories/{id} | bank manager | Đổi tên / xóa danh mục rỗng |
| GET/POST | /questions | bank viewer / editor | List theo `bank_id`, `category_id`, `q`, `type`, `difficulty`; chỉ owner/người có quyền `edit` được tạo câu bằng `{bank_id, category_id?}`. Bỏ `category_id` thì backend tự gán “Chưa phân loại”. Body tạo/sửa xem dưới bảng |
| GET/PATCH/DELETE | /questions/{id} | bank viewer/editor | Người có quyền xem đọc chi tiết (kèm đáp án, test, lời giải); lecturer có quyền sửa được cập nhật; admin có thể soft-delete để xử lý đặc biệt. Bản đã publish giữ snapshot cũ |
| PUT | /questions/{id}/test-cases | bank manager | Tương thích cũ: thay toàn bộ test cases. Form mới gửi test trong POST/PATCH |
| POST | /questions/draw | lec | Bốc ngẫu nhiên: `{rules: [{bank_id, category_id?, difficulty?, type?, count}], exclude_question_ids?}` (1–10 quy tắc, `count` 1–100) → `{items: QuestionSummary[], shortages: [{rule, requested, available}]}`. Chỉ ngân hàng được xem, không lặp câu, bỏ câu đã xóa |
| POST | /questions/{id}/verify | bank manager | Kiểm tra đề: chạy `solution_code` của phiên bản mới nhất trên mọi test → `202 {run_id}` (`problem_check`). 409 `VALIDATION_ERROR` nếu chưa có lời giải/ngôn ngữ lời giải |
| POST | /questions/draft-check | lec (bank editor) | Chạy code trên test chưa lưu (sinh expected từ lời giải): `{bank_id, language, source_code, time_limit_ms, memory_limit_mb, checker_mode, checker_epsilon?, tests: [{input, expected_output?}]}` → `202 {run_id}` (`draft_check`) |
| GET | /run-jobs/{id} | người tạo job | `{run_id, kind, status, verdict, compile_output, error_message, duration_ms, tests: [{position, verdict, time_ms, output, input?, expected_output?}], created_at, completed_at}`; `status`: `pending`/`running`/`completed`/`failed` |
| POST | /question-banks/{id}/categories/{categoryId}/questions/import/preview | bank manager | Preview CSV đã đọc ở trình duyệt: `{rows: [{row, type?, content, difficulty, options, correct_option, explanation?}]}`; `type` ∈ `mcq`/`multiple_choice`/`true_false`/`short_answer` (mặc định `mcq`); `correct_option` là chữ cái (`A`, hoặc `A;C` cho nhiều đáp án, `A`/`B` cho đúng-sai) hoặc với `short_answer` là các đáp án chấp nhận phân cách `|`. Tối đa 500 dòng, báo trùng/lỗi; không ghi DB |
| POST | /question-banks/{id}/categories/{categoryId}/questions/import | bank manager | Xác nhận payload preview; backend kiểm tra lại, tạo các dòng hợp lệ có version đầu tiên; trả `{created, errors: [{row, code, reason}]}`. Dialog có chọn danh mục đích, mặc định “Chưa phân loại” |

**Body tạo/sửa câu hỏi** (`POST /questions`, `PATCH /questions/{id}` — một transaction, một version; chi tiết ở `assessment-spec.md` §1–4):

```json
{"bank_id": 1, "category_id": 3, "type": "matching", "content": "Markdown…", "difficulty": "medium",
 "explanation": "Markdown…", "scoring_mode": "partial",
 "options": [{"content": "…", "is_correct": true}],
 "answer_spec": {"pairs": [{"left": "HTTP", "right": "80"}], "distractors": [{"text": "8080"}]},
 "programming": {"allowed_languages": ["python","cpp"], "time_limit_ms": 1000, "memory_limit_mb": 256,
                 "checker_mode": "token", "checker_epsilon": null,
                 "starter_codes": {"python": "…"}, "solution_code": "…", "solution_language": "python"},
 "test_cases": [{"input": "1 2", "expected_output": "3", "is_public": true}]}
```

`type` không đổi được sau khi tạo. Response `QuestionView` trả thêm `explanation`, `scoring_mode`, `answer_spec` (đã có ID), `programming.{checker_mode, checker_epsilon, starter_codes, solution_language}`.

## 6. Assignments & Submissions (M5/M6)

| Method | Path | Role | Mô tả |
|---|---|---|---|
| GET/POST | /classes/{id}/assignments | mem / lec | List bài đã publish cho sinh viên / list của lớp cho giảng viên; POST lecturer tạo nháp với metadata, `review_mode`, `review_shows_answers`, `shuffle_questions`, `shuffle_options` và `questions: [{question_id, points, position}]` |
| POST | /assignments/bulk | lec | Tạo đề cho một hoặc nhiều `class_ids` thuộc cùng học phần và do giảng viên phụ trách: `{class_ids, assignment, publish}`. Tạo bản riêng từng lớp trong một giao dịch; `publish=true` ghim phiên bản và xuất bản ngay |
| GET/PATCH/DELETE | /assignments/{id} | mem / lec | Chi tiết theo snapshot (xem "Đề cho sinh viên" dưới bảng; không đọc được đề trước `available_from`) / PATCH và DELETE thông thường chỉ áp dụng khi còn nháp |
| PATCH | /assignments/{id}/published-settings | lec | Giảng viên phụ trách sửa tiêu đề, mô tả, lịch mở/hạn, chính sách nộp muộn, `review_mode`, `review_shows_answers`, kèm `reason`; không nhận trường câu hỏi/điểm/cách chấm/trộn. Ghi audit before/after |
| POST | /assignments/{id}/publish | lec | Body tùy chọn `{confirm_unverified}`. Kiểm tra đầy đủ câu hỏi (`assessment-spec.md` §4) và chặn theo kiểm tra đề (§7), ghim version hiện hành cùng điểm/thứ tự. `POST /assignments/bulk` nhận cùng trường `confirm_unverified` |
| GET/POST | /assignments/{id}/quiz-attempts | student | Chỉ `category=quiz`: GET lịch sử lượt của tôi; POST nộp `{answers: [Answer]}` (`assessment-spec.md` §3.2) + Idempotency-Key → chấm đồng bộ, trả `QuizAttemptView`. Câu không có trong `answers` = bỏ trống, 0 điểm; câu lạ/trùng bị từ chối; key trùng khác nội dung → 409 `IDEMPOTENCY_CONFLICT` |
| GET | /assignments/{id}/quiz-attempts/{attemptId} | owner / lec | Xem lại một lượt theo chính sách (`assessment-spec.md` §6): `AttemptReview` |
| POST | /assignments/{id}/questions/{qid}/submissions | student | Chỉ bài **không phải quiz**: nộp từng câu bằng `Answer` (câu khách quan) hoặc `{language, source_code}` (code) + Idempotency-Key. `max_attempts` và best/last tính riêng cho câu; câu khách quan chấm đồng bộ; code qua worker |
| POST | /assignments/{id}/questions/{qid}/run | student | Chạy thử (`practice_run`): `{language, source_code, custom_input?}` → `202 {run_id}`; không có `custom_input` thì chạy test công khai. Không tính lượt/điểm; 6 lần/phút |
| GET | /submissions/{id} | owner/lec | `SubmissionDetails` (dưới bảng) |
| GET | /me/submissions?assignment_id= | student | Lịch sử nộp từng câu (điểm câu khách quan ẩn đến khi được xem lại); lịch sử quiz theo `/assignments/{id}/quiz-attempts` |
| GET | /assignments/{id}/submissions | lec | Danh sách lượt nộp có tên/mã sinh viên, câu hỏi, trạng thái, verdict, ngôn ngữ và điểm; lọc `question_id`, `status`, `verdict`, `q` |
| GET | /assignments/{id}/results | lec | Bảng kết quả theo sinh viên của lớp: `{items: [{student_id, student_full_name, student_code, final_score, max_score, attempt_count, attempts?: [{attempt_id, attempt_no, score, is_late, submitted_at}], questions: [{question_id, final_score, attempt_count, last_status, last_verdict}]}]}`; `final_score` theo `score_policy`, `null` nếu chưa nộp |
| POST | /submissions/{id}/regrade | lec | `{reason}` → 202; chỉ bài code `completed`/`failed` (BR8, `assessment-spec.md` §5) |

**Đề cho sinh viên** (`GET /assignments/{id}`, role student): câu theo thứ tự đã trộn; mỗi câu có `question_id`, `question_version_id`, `type`, `content`, `points`, `position`, và theo loại: `options [{id, content}]` (không `is_correct`), `blank_count`, `matching {lefts:[{id,text}], rights:[{id,text}]}`, `ordering_items [{id,text}]`, `programming {allowed_languages, time_limit_ms, memory_limit_mb, checker_mode, starter_codes, samples:[{position, input, expected_output}]}`. Không bao giờ có `answer_spec`, `explanation`, `solution_code`, test ẩn. Giảng viên nhận thêm `explanation`, `scoring_mode`, `answer_spec`, đáp án đúng và mọi test.

**QuizAttemptView**: `{attempt_id, attempt_no, score, max_score, is_late, late_penalty_percent, submitted_at, review_available, review_available_at, question_scores: [{question_id, score, max_score}] | null}` — `question_scores` là `null` khi chưa được xem lại.

**AttemptReview**: `{attempt: QuizAttemptView, review_available, shows_answers, questions: [{question (dạng đề cho sinh viên, đúng thứ tự lượt đó), response, score, max_score, correct_answer?, explanation?}]}`. `correct_answer` theo loại: `{option_ids}` · `{accepted}` · `{value, tolerance}` · `{blanks: [[...accepted]]}` · `{matches: {left_id: right_id}}` · `{order: [item_id]}`. Khi chưa được xem lại: `questions` rỗng.

**SubmissionDetails**: `{id, assignment_id, question_id, question_version_id, student_id, attempt_no, type, status, verdict, score, max_score, language, source_code, response, is_late, submitted_at, result: ResultView|null, results: [ResultView] (lịch sử chấm, mới nhất trước), review_available}`. `ResultView`: `{grading_attempt, status, verdict, compile_error, compile_output, error_message, graded_at, duration_ms, tests_total, tests_passed, failed_test, tests: [{position, is_public, verdict, time_ms, memory_kb, input?, expected_output?, output?}]}` — sinh viên chỉ nhận `input/expected_output/output` của test công khai.

### Chấm code (M6)

- POST code nhận `language` (thuộc snapshot), `source_code` (UTF-8, không rỗng, ≤ 128 KiB). Trả `202 {submission_id, status:"pending"}` sau khi lưu bài nộp và outbox; key trùng cùng nội dung trả bản gốc `200`, khác nội dung → `409 IDEMPOTENCY_CONFLICT`. Khi nộp chỉ kiểm tra ngôn ngữ và kích thước code; kiểm tra đầy đủ đề chỉ chạy lúc xuất bản.
- API khóa bài tập khi kiểm tra lượt/hạn; submission `failed` không tính lượt. Điểm tối đa và phần trăm phạt muộn được ghim vào submission.
- Verdict và điểm theo `assessment-spec.md` §5: `AC` → điểm câu sau phạt muộn; verdict khác → 0; `failed` → `null`.
- WebSocket chỉ báo thay đổi sau khi kết quả đã commit. Client đọc lại GET khi reconnect.

## 7. Exams (M7)

| Method | Path | Role | Mô tả |
|---|---|---|---|
| GET/POST | /classes/{id}/exams | mem(list) / lec | List / tạo (đề, `grade_category=midterm\|final`, duration, opens/closes, rules, shuffle) |
| GET/PATCH | /exams/{id} | mem / lec | Chi tiết (chưa publish: chỉ metadata) / sửa nháp / publish; publish ghim snapshot phiên bản câu hỏi/điểm/thứ tự; exam đã publish không sửa trực tiếp |
| POST | /exams/{id}/sessions | student | Bắt đầu phiên: check khung giờ + xác nhận quy chế → session + đề theo snapshot đã publish (BR9) |
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
