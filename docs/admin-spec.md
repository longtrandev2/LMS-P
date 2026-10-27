# Đặc tả quản trị, vận hành và thông báo

| | |
|---|---|
| Phiên bản | 1.0 — 2026-10-27 |
| Phạm vi | M10 (cấu hình, thống kê, nhật ký kiểm toán) + mở rộng vận hành (kết nối realtime, job chấm lỗi, thông báo hệ thống, bảo trì, phiên đăng nhập, xuất CSV) + bù M9 (FR-NTF-01) |
| Nguồn yêu cầu | SRS M10 FR-ADM-01..03; chủ dự án chọn thêm A–E ngày 2026-10-27 |
| Quan hệ | REST ở `api-spec.md` §9; schema ở `database-design.md` §2.9 |

Mọi API trong tài liệu này chỉ dành cho `admin`, trừ khi ghi khác. Mọi thao tác thay đổi đều ghi `audit_logs`.

## 1. Cấu hình hệ thống (FR-ADM-01)

Bảng `system_settings` (khóa → giá trị JSON). Thiếu khóa thì dùng mặc định trong bảng dưới, nên hệ thống chạy được cả khi bảng trống. API giữ bản cache trong bộ nhớ và làm mới ngay sau mỗi lần sửa.

| Nhóm | Khóa | Kiểu / khoảng hợp lệ | Mặc định | Dùng ở |
|---|---|---|---|---|
| Chấm code | `allowed_languages` | mảng con khác rỗng của `python, c, cpp, java` | cả 4 | Soạn câu lập trình (form + validator). Câu/bài đã ghim phiên bản không bị ảnh hưởng. |
| | `default_time_limit_ms` | 100 – `max_time_limit_ms` | 1000 | Giá trị điền sẵn khi tạo câu lập trình |
| | `default_memory_limit_mb` | 32 – `max_memory_limit_mb` | 256 | như trên |
| | `max_time_limit_ms` | 1000 – 20000 | 10000 | Trần time limit khi soạn câu |
| | `max_memory_limit_mb` | 64 – 2048 | 1024 | Trần memory limit khi soạn câu |
| | `practice_runs_per_minute` | 1 – 60 | 6 | Giới hạn chạy thử mỗi sinh viên (cả trong phiên thi) |
| Upload | `max_upload_mb` | 1 – trần server (`MAX_UPLOAD_MB`, mặc định 20) | 20 | Dung lượng tối đa của học liệu |
| | `leave_evidence_max_mb` | 1 – 20, không vượt trần server | 5 | Minh chứng đơn xin nghỉ |
| Sổ điểm | `default_grade_policy` | cùng định dạng và kiểm tra như `grade_policy` của lớp (`class-schedule-grades-spec.md` §5) | 10/20/20/50; nghỉ tối đa null (= 20%); trừ 2 / 0,5 / 0 | Chính sách của lớp chưa tự cấu hình |
| Vận hành | `maintenance` | `{enabled: bool, message: string ≤ 500}` | `{enabled: false}` | §5.2 |

- `GET /admin/settings` → `{items: [{key, value, default_value, description, updated_by: {id, full_name}|null, updated_at|null}]}`.
- `PUT /admin/settings {values: {key: value, …}, reason?}`: kiểm tra toàn bộ trước khi ghi; một khóa sai thì không ghi khóa nào (400 `VALIDATION_ERROR`, `details: {key: message}`). Ràng buộc chéo (default ≤ max) kiểm tra trên giá trị sau khi gộp. Audit `settings.update` với before/after của các khóa đổi.
- `GET /settings/public` (mọi user đăng nhập) → `{allowed_languages, default_time_limit_ms, default_memory_limit_mb, max_time_limit_ms, max_memory_limit_mb, max_upload_mb, leave_evidence_max_mb, maintenance: {enabled, message}}`.
- Web: form soạn câu lập trình, upload học liệu và đơn xin nghỉ đọc giới hạn từ `/settings/public`; không còn hằng số ghi cứng.

## 2. Thống kê (FR-ADM-03)

`GET /admin/stats?days=7|30` (mặc định 7). Ngày tính theo giờ Việt Nam (UTC+7).

```
{
  generated_at,
  totals: {users: {student, lecturer, admin, locked}, active_classes, submissions_today, sessions_in_progress},
  daily: [{date, submissions_objective, submissions_code, new_users, grading_avg_ms, grading_p95_ms}],
  verdicts: {AC, WA, TLE, MLE, RE, CE, OLE, SYSTEM_ERROR, failed},
  top_classes: [{class_id, code, name, submissions}]   // 5 lớp nhiều bài nộp nhất trong kỳ
}
```

- Bài nộp theo ngày: `submissions` theo `submitted_at`, tách `type` (mcq = khách quan, code).
- Độ trễ chấm: `grading_results.graded_at − submissions.submitted_at` của lần chấm đầu tiên, chỉ bài code. p95 tính trên tập giá trị của ngày; ngày không có bài thì null.
- Verdict: verdict cuối của bài code nộp trong kỳ; `failed` đếm bài `status = failed`.
- Lớp đang học: lớp có trạng thái `active`.
- Mọi số liệu là truy vấn gộp, không thêm bảng tổng hợp.

`GET /admin/stats/export?days=` → CSV UTF-8 có BOM, cùng dữ liệu `daily`.

## 3. Hàng đợi và kết nối realtime (mở rộng A)

`GET /health/queue` (công khai như `/health`) → `{queues: [{name, messages, consumers}], checked_at}` cho `q.grading`, `q.grading.dead`, `q.grading.events`, `q.grading.events.dead`, `q.runs`, `q.runs.dead`, `q.run.events`, `q.run.events.dead`. Đọc bằng khai báo passive qua AMQP, không cần plugin management. Broker không phản hồi → 503 kèm `queues: []`.

`GET /admin/realtime` → `{ws_connections, ws_users, online_users: {student, lecturer, admin, total}, workers, checked_at}`:

- `ws_connections` / `ws_users`: số kết nối và số user đang mở WebSocket chấm bài. WebSocket vẫn **chỉ** dùng cho trạng thái/kết quả chấm (quy tắc dự án). Mục này chỉ đếm kết nối.
- `online_users`: user có request REST đã xác thực trong 5 phút gần nhất (bộ đếm trong bộ nhớ của API, mất khi khởi động lại).
- `workers`: số consumer của `q.grading`.

Web: dashboard cập nhật thẻ hàng đợi và realtime mỗi 10 giây.

## 4. Job chấm lỗi (mở rộng B)

- `GET /admin/grading/failed?page&limit` → danh sách bài nộp `status = failed`, mới nhất trước: `{submission_id, assignment_id, assignment_title, class_code, student_full_name, student_code, language, submitted_at, error_message, grading_attempts}`.
- `POST /admin/grading/regrade {submission_ids?: [..], all_failed?: bool, reason}`:
  - Đưa bài về `pending` và tạo job mới, như chấm lại của giảng viên (BR8, giữ lịch sử).
  - Tối đa 500 bài mỗi lần. Bài không còn `failed` thì bỏ qua.
  - Trả `{queued, skipped}`. Audit `grading.bulk_regrade`.
- `POST /admin/queues/{name}/purge {reason}`: chỉ cho phép các hàng `.dead`. Trả `{purged}`. Audit `queue.purge`.

## 5. Thông báo hệ thống và bảo trì (mở rộng C)

### 5.1 Thông báo hệ thống

- `POST /admin/announcements {title ≤ 200, body ≤ 2000 (markdown), audience: all|role|class, role?, class_id?}`:
  - Tạo bản ghi `announcements`.
  - Tạo thông báo in-app loại `system.announcement` cho từng người nhận (user không bị khóa; `class` = sinh viên active của lớp + giảng viên).
  - Trả `{id, recipient_count}`. Audit `announcement.create`.
- `GET /admin/announcements?page&limit` → lịch sử thông báo đã gửi.

### 5.2 Chế độ bảo trì

Bật/tắt qua khóa `maintenance` (§1).

Khi bật, API trả **503 `MAINTENANCE`** (kèm `message`) cho các thao tác **bắt đầu việc mới**:

- bắt đầu phiên làm bài mới (tiếp tục phiên đang làm vẫn được);
- nộp quiz kiểu cũ;
- nộp từng câu;
- chạy thử;
- tạo đơn xin nghỉ;
- upload học liệu.

Không chặn:

- đăng nhập, xem dữ liệu;
- tự lưu và nộp của phiên đang làm (để kỳ thi đang diễn ra kết thúc bình thường);
- mọi thao tác của admin.

Web hiện banner vàng trên mọi trang khi bảo trì đang bật. Trạng thái lấy từ `/settings/public`, đọc lại mỗi 60 giây.

## 6. Phiên đăng nhập (mở rộng D)

`refresh_tokens` thêm `ip`, `user_agent` (≤ 255), `last_used_at`. Khi đăng nhập/refresh, API lưu các trường này. Mỗi lần refresh là một token mới; "phiên" = chuỗi token xoay vòng, nhận diện bằng `session_family` (UUID gán khi đăng nhập, giữ qua các lần refresh).

- `GET /admin/users/{id}/sessions` → các phiên còn hiệu lực (chưa thu hồi, chưa hết hạn) gom theo family: `{family, ip, user_agent, created_at (đăng nhập), last_used_at, expires_at}`.
- `DELETE /admin/users/{id}/sessions/{family}` thu hồi một phiên. `DELETE /admin/users/{id}/sessions` thu hồi tất cả. Audit `user.sessions_revoke`.
- Access token đang dùng vẫn sống tới khi hết hạn (ngắn). Sau đó client không refresh được và phải đăng nhập lại.

## 7. Nhật ký kiểm toán và xuất CSV (FR-ADM-02, mở rộng E)

- Web thêm nhãn tiếng Việt cho các hành động mới:
  - `session.*`, `assignment.reseed`, `settings.update`, `grading.bulk_regrade`, `queue.purge`, `announcement.create`, `user.sessions_revoke`;
  - các hành động điểm danh, đơn xin nghỉ và sổ điểm còn thiếu nhãn.
- `GET /admin/audit-logs/export?{bộ lọc như GET list}` → CSV UTF-8 có BOM, tối đa 50 000 dòng mới nhất. Cột: thời điểm (giờ VN), người thực hiện, hành động, đối tượng, mã đối tượng, IP, giá trị trước, giá trị sau (JSON).

## 8. Bù thông báo M9 (FR-NTF-01)

| Loại | Khi nào | Người nhận | `data` |
|---|---|---|---|
| `assignment.published` | Bài tập/quiz xuất bản (cả bulk) | Sinh viên active của lớp | `{assignment_id, class_id}` |
| `exam.published` | Kỳ thi (`midterm`/`final`) xuất bản | như trên | `{assignment_id, class_id}` |
| `exam.upcoming` | 30 phút trước `available_from` của kỳ thi; scheduler mỗi phút, đánh dấu `assignments.upcoming_notified_at` | như trên | `{assignment_id, class_id}` |
| `grade.released` | Bài quiz/kỳ thi có `review_mode = after_close` vừa đóng; scheduler mỗi phút, đánh dấu `assignments.results_notified_at` | Sinh viên có lượt nộp | `{assignment_id, class_id}` |
| `system.announcement` | §5.1 | theo đối tượng | `{announcement_id}` |

Bấm thông báo dẫn tới trang của bài tương ứng. Thông báo hệ thống không có liên kết.

Chi tiết vận hành:
- Scheduler chạy theo cron `lms.notifications.exam-cron` (mặc định mỗi phút).
- `grade.released` chỉ gửi khi bài đã đóng ít nhất 1 phút. Khoảng này để scheduler kịp tự nộp các phiên còn dở, nhờ đó những sinh viên đó cũng được tính là đã nộp.
- Kỳ thi xuất bản khi đã vào khung 30 phút trước giờ mở thì gửi cả `exam.published` lẫn `exam.upcoming`.
- Đánh dấu "đã gửi" bằng câu lệnh cập nhật có điều kiện, nên mỗi thông báo chỉ gửi một lần.

## 9. Màn hình (web)

| Route | Nội dung |
|---|---|
| `/admin` | **Tổng quan**: trang chủ của admin. Có thể thêm: <ul><li>ô thống kê (người dùng, lớp đang học, bài nộp hôm nay, phiên thi đang diễn ra);</li><li>thẻ "Realtime" (online theo vai trò, kết nối WebSocket, worker);</li><li>thẻ "Hàng đợi chấm" (độ sâu từng hàng, DLQ đỏ khi > 0, link sang Vận hành);</li><li>biểu đồ bài nộp theo ngày (cột chồng khách quan/code), độ trễ chấm (đường trung bình + p95), phân bố verdict (thanh ngang);</li><li>bảng top lớp;</li><li>chọn 7/30 ngày, nút xuất CSV.</li></ul> Biểu đồ tự vẽ bằng SVG, đơn sắc theo DESIGN.md; đỏ chỉ dùng cho lỗi. |
| `/admin/settings` | Form theo nhóm (Chấm code / Upload / Sổ điểm / Bảo trì): <ul><li>"Sửa lần cuối bởi … lúc …";</li><li>nút Lưu chỉ sáng khi có thay đổi, xác nhận liệt kê thay đổi;</li><li>bật bảo trì có xác nhận riêng.</li></ul> |
| `/admin/operations` | **Vận hành**: <ul><li>bảng bài chấm lỗi (chọn nhiều → Chấm lại, có lý do);</li><li>hàng đợi chết với số message và nút Dọn;</li><li>gửi thông báo hệ thống (form + lịch sử).</li></ul> |
| `/admin/users` | Thêm hành động "Phiên đăng nhập" trên mỗi user: sheet liệt kê phiên, thu hồi một/tất cả. |
| `/admin/audit-logs` | Thêm nút "Xuất CSV" theo bộ lọc hiện tại; nhãn mới. |

Sidebar admin: Tổng quan · Người dùng · Học phần & lớp · Vận hành · Cấu hình · Nhật ký kiểm toán.
