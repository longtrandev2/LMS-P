# Đặc tả kỳ thi, cấu trúc đề và phiên làm bài

| | |
|---|---|
| Phiên bản | 1.0 — 2026-10-27 |
| Phạm vi | M7 (kỳ thi), quiz giới hạn thời gian, đề nhiều mã / đề riêng từng sinh viên (mở rộng M5) |
| Nguồn yêu cầu | Chủ dự án: cấu hình đề linh hoạt (một đề hoặc nhiều đề; chọn tay, ngẫu nhiên, ma trận đề), chống gian lận mức "ghi log + cảnh báo", quiz có giờ dùng chung cơ chế phiên thi |
| Quan hệ | Mở rộng `assessment-spec.md` §6; REST ở `api-spec.md` §7; schema ở `database-design.md` §2.11 |

Tài liệu này là hợp đồng chung cho API và web. Mâu thuẫn với chỗ khác thì sửa theo tài liệu này.

## 1. Mô hình

Kỳ thi **là một bài tập** (`assignments`) có `category = midterm | final`. Nhờ vậy kỳ thi dùng lại toàn bộ phần đã có: ghim phiên bản câu hỏi khi xuất bản, chấm khách quan, chấm code qua worker, xem lại, chấm lại, bảng kết quả, và sổ điểm (`midterm`/`final` đã đổ vào cột Giữa kỳ/Cuối kỳ — `class-schedule-grades-spec.md` §5).

Bài được **giao theo phiên** (session-based) khi:

- `category` là `midterm` hoặc `final` (luôn luôn); hoặc
- `category = quiz` và có `time_limit_minutes` hoặc `paper_mode ≠ same`.

Bài giao theo phiên: sinh viên bấm "Bắt đầu" → server tạo **phiên làm bài** (`attempt_sessions`) có giờ kết thúc → tự lưu → nộp (tay hoặc server tự nộp khi hết giờ). Quiz không giới hạn giờ và một đề chung vẫn dùng luồng nộp cả bài cũ (`POST /assignments/{id}/quiz-attempts`). `category = assignment` không giao theo phiên.

## 2. Cấu hình bài

Thêm vào `assignments`:

| Trường | Giá trị | Mặc định | Ghi chú |
|---|---|---|---|
| `time_limit_minutes` | 1–600 hoặc `null` | `null` | Bắt buộc với `midterm`/`final` |
| `paper_mode` | `same` \| `variants` \| `per_student` | `same` | §3.3 |
| `variant_count` | 2–20 | `null` | Bắt buộc khi `variants`, `null` ở mode khác |
| `rules_text` | Markdown ≤ 10 000 ký tự | `null` | Quy chế; có nội dung thì sinh viên phải tick xác nhận trước khi bắt đầu |
| `paper_seed` | số nguyên 64 bit | ngẫu nhiên khi tạo | Chỉ API dùng; đổi bằng "Bốc lại" (§3.5) |

Ràng buộc theo hạng mục:

- `midterm`/`final`: `max_attempts = 1`, `allow_late = false`, `score_policy = last`; API ép các giá trị này, không nhận giá trị khác. `review_mode` mặc định `after_close`. Được chứa mọi loại câu.
- `quiz` giao theo phiên: giữ `max_attempts`/`score_policy` như quiz thường; mỗi lượt là một phiên. Không có câu `programming` (như `assessment-spec.md` §6).
- Kỳ thi `final`: sinh viên **không đủ điều kiện dự thi** (vượt số buổi nghỉ, `class-schedule-grades-spec.md` §5.3) không được bắt đầu phiên → 403 `NOT_ELIGIBLE`.
- Sau xuất bản: được sửa tiêu đề, mô tả, `rules_text`, lịch mở/đóng, `review_mode`, `review_shows_answers` (qua `published-settings`, có lý do, audit). Không sửa `time_limit_minutes`, `paper_mode`, cấu trúc đề; muốn đổi thời gian một sinh viên thì gia hạn phiên (§5.6).

## 3. Cấu trúc đề

### 3.1 Phần (section)

Đề gồm một hoặc nhiều **phần** có thứ tự, ví dụ "Phần I — Trắc nghiệm", "Phần II — Lập trình". Phần không trộn với nhau; `shuffle_questions` chỉ trộn câu **trong cùng phần**. Bài cũ không có phần được coi là một phần không tên.

### 3.2 Mục trong phần

Mỗi phần chứa các **mục**, có hai loại:

| Loại | Lưu ở | Nội dung |
|---|---|---|
| Câu cố định (chọn tay) | `assignment_questions` với `draw_rule_id = null` | Một câu hỏi cụ thể + điểm |
| Quy tắc ngẫu nhiên | `assignment_draw_rules` | Ngân hàng, danh mục?, độ khó?, loại câu?, `count` (1–100), `points` mỗi câu |

Mỗi mục có `variant_no`: `null` = có trong mọi mã đề; `1..variant_count` = chỉ có trong mã đề đó (chỉ dùng khi `paper_mode = variants`). Nhờ vậy giảng viên soạn được:

- **Một đề chọn tay**: `same` + chỉ câu cố định.
- **Một đề bốc ngẫu nhiên**: `same` + quy tắc, bốc một lần khi xuất bản, cả lớp cùng đề.
- **Nhiều mã đề bốc ngẫu nhiên**: `variants` + quy tắc chung (`variant_no = null`).
- **Nhiều mã đề soạn tay**: `variants` + câu cố định gắn `variant_no` từng đề.
- **Mỗi sinh viên một đề**: `per_student` + quy tắc; mỗi sinh viên bốc riêng khi bắt đầu phiên.
- Trộn tùy ý: câu cố định chung + quy tắc, ví dụ 2 câu code cố định và 20 câu trắc nghiệm bốc ngẫu nhiên.

**Ma trận đề** là công cụ trên giao diện: bảng *danh mục × độ khó*, mỗi ô nhập số câu, cùng điểm mỗi câu cho cả ma trận. Khi lưu, mỗi ô > 0 thành một quy tắc. API chỉ biết quy tắc.

### 3.3 Chế độ giao đề (`paper_mode`)

| Mode | Đề được sinh khi | Số đề | Sinh viên nhận |
|---|---|---|---|
| `same` | Xuất bản | 1 | Cùng một đề |
| `variants` | Xuất bản | `variant_count` mã đề (mã 101, 102, …) | Mã đề được chia đều (§5.2) |
| `per_student` | Sinh viên bắt đầu phiên | Một đề mỗi phiên | Đề bốc riêng từ kho câu đã ghim |

Trộn câu (`shuffle_questions`) và trộn lựa chọn (`shuffle_options`) áp thêm theo từng sinh viên ở mọi mode, seed như `assessment-spec.md` §6.1.

### 3.4 Kho câu của quy tắc (pool)

Kho câu của một quy tắc = các câu khớp điều kiện trong ngân hàng (cùng điều kiện với `POST /questions/draw`), **trừ** câu cố định của bài và câu đã thuộc kho của quy tắc đứng trước. Thứ tự xét quy tắc: theo phần, rồi theo vị trí trong phần. Kho của các quy tắc vì vậy không giao nhau và một câu không bao giờ xuất hiện hai lần trong một đề. Quiz luôn loại câu `programming` khỏi kho.

Khi bốc: lấy `count` câu từ kho bằng ngẫu nhiên có seed. Với `variants`, mỗi quy tắc bốc cho mã 1, 2, … lần lượt và **ưu tiên câu ít được dùng** ở các mã trước. Hai mã đề vì vậy khác nhau nhiều nhất có thể, và chỉ trùng câu khi kho nhỏ.

Kiểm tra khi xuất bản (và khi xem trước):

- Kho < `count` → 400 `VALIDATION_ERROR`, `details.shortages = [{rule_id, requested, available}]`.
- Mọi đề có cùng **tổng điểm** và tổng điểm > 0. Với `variants` soạn tay, tổng điểm các mã khác nhau → 400 `VALIDATION_ERROR`, `details.variant_totals = {"1": 10, "2": 9.5}`.
- `per_student`: kho < 2 × `count` thì không chặn, chỉ cảnh báo trên giao diện ("đề dễ trùng").
- Tổng số câu được ghim của một bài ≤ 500 (mọi kho cộng lại).

### 3.5 Xem trước và bốc lại

- Đề sinh tất định từ `paper_seed` và danh sách câu hiện có trong ngân hàng. Xem trước bản nháp là đề sẽ được xuất bản, nếu ngân hàng không đổi ở giữa.
- "Bốc lại" (bản nháp) đổi `paper_seed` để có bộ đề khác.
- Xem trước `per_student` hiện một "đề mẫu" (seed của giảng viên) kèm kích thước kho từng quy tắc.

### 3.6 Khi xuất bản

Ngoài các bước hiện có (kiểm tra câu, chặn kiểm tra đề code, ghim phiên bản):

1. Giải kho các quy tắc, bốc đề theo §3.4.
2. Tạo `assignment_questions` cho câu được bốc, có `draw_rule_id` và `points` của quy tắc:
   - `same`/`variants`: chỉ các câu có mặt trong ít nhất một đề;
   - `per_student`: **toàn bộ kho**.

   Mọi câu đều được ghim phiên bản.
3. Tạo `assessment_papers`: `same` có 1 đề (`code = null`); `variants` có N đề (`code = "101"…`); `per_student` chưa có đề nào. Tạo kèm `paper_items` (câu + thứ tự gốc theo phần).
   - **Thứ tự gốc**: theo phần. Trong mỗi phần, câu cố định đứng trước (theo `position`), sau đó là câu bốc ngẫu nhiên (theo thứ tự quy tắc, rồi thứ tự bốc).
   - Bài không giao theo phiên không tạo bản ghi đề.

Bất biến: với `same`, tập `assignment_questions` của bài **trùng** với đề duy nhất. Các luồng cũ (nộp quiz, kết quả, xem lại) đọc "mọi câu của bài" vì vậy vẫn đúng. Với `variants`/`per_student`, các luồng này phải đọc theo đề của phiên.

## 4. Thời gian

- Mọi giờ do server quyết định. Mọi response của phiên trả `server_now`, `ends_at`, `remaining_seconds`. Client tính độ lệch đồng hồ, đếm ngược cục bộ, và hiệu chỉnh lại sau mỗi lần lưu hoặc heartbeat.
- `ends_at = min(started_at + time_limit_minutes, closes_at) + extra_minutes`. Quiz không có giới hạn giờ thì `ends_at = closes_at`.
- **Ân hạn** 5 giây sau `ends_at` cho độ trễ mạng: lưu và nộp trong khoảng này vẫn được nhận. Sau đó → 409 `SESSION_ENDED`.
- Không bắt đầu được ngoài `[available_from, closes_at)` → 409 `EXAM_NOT_OPEN`. Nếu còn ít hơn 1 phút trước `closes_at` cũng từ chối, cùng mã lỗi.

## 5. Phiên làm bài (`attempt_sessions`)

### 5.1 Trạng thái

`in_progress` → `submitted`. `submit_reason`:

- `manual`: sinh viên nộp;
- `timeout`: server tự nộp khi hết giờ;
- `forced`: giảng viên thu bài.

Trạng thái chấm suy ra từ các submission của lượt (`assignment_attempts`).

### 5.2 Bắt đầu

`POST /assignments/{id}/sessions {accept_rules}`:

1. Sinh viên ghi danh active, bài đã xuất bản và giao theo phiên. Không thì 404, hoặc 409 `CONFLICT` "Bài không làm theo phiên".
2. Đang có phiên `in_progress` của sinh viên cho bài này → trả phiên đó (200). Sinh viên vào lại bài sau khi mất mạng hoặc đổi máy theo cách này. Ghi sự kiện `resumed`.
3. Kiểm tra theo thứ tự:
   - khung giờ (§4);
   - số lượt: số phiên đã có < `max_attempts`, kỳ thi là 1 → không thì 409 `ATTEMPT_EXCEEDED`;
   - điều kiện dự thi (`final`);
   - `rules_text` có nội dung mà `accept_rules ≠ true` → 400 `VALIDATION_ERROR`.
4. Chọn đề:
   - `same`: đề duy nhất.
   - `variants`: mã đề đang có **ít phiên nhất**. Hòa thì chọn theo seed `assignment:student`. Số sinh viên mỗi mã vì vậy chênh nhau tối đa 1.
   - `per_student`: bốc từ kho đã ghim với seed `"{paper_seed}:{student_id}:{attempt_no}"`, tạo `assessment_papers` có `student_id`.
5. Tính thứ tự hiển thị: phần giữ thứ tự; trong phần trộn nếu `shuffle_questions`; seed theo `PaperShuffler.of(assignment, student, attempt_no)`. Thứ tự lưu vào `question_order` (mảng `assignment_question_id`) để xem lại đúng như lúc làm.
6. Tạo phiên (201), ghi sự kiện `started`, audit `session.start`. Khóa `(assignment, student)` khi tạo để hai request đồng thời không tạo hai phiên. Ràng buộc UNIQUE `(assignment_id, student_id, attempt_no)` chặn nốt phần còn lại.

### 5.3 Đề và câu trả lời đã lưu

`GET /attempt-sessions/{id}` (chủ phiên):

- Trả `AttemptSessionView`: `{session, sections: [{title, questions: [...]}], answers: [...]}`. Câu hỏi theo "đề cho sinh viên" (`api-spec.md` §6), đúng thứ tự `question_order`, có trộn lựa chọn.
- Đề **chỉ** đọc được qua phiên. `GET /assignments/{id}` của bài giao theo phiên chỉ trả metadata cho sinh viên: số câu, tổng điểm, thời lượng, quy chế, và các phiên của tôi (BR9).
- Sau khi nộp: phiên vẫn đọc được trạng thái; đề và câu trả lời chỉ xem qua trang xem lại theo `review_mode`.

### 5.4 Tự lưu

`PUT /attempt-sessions/{id}/answers {answers: [{question_id, answer?: Answer, code?: {language, source_code}}]}`:

- Upsert từng câu, tối đa 50 câu mỗi request. `answer` theo `assessment-spec.md` §3.2, được chuẩn hóa như khi nộp. Câu lập trình dùng `code`: ngôn ngữ phải thuộc snapshot; code ≤ 128 KiB, được phép rỗng.
- `answer: null` (hoặc không gửi `answer` lẫn `code`) = xóa câu trả lời của câu đó.
- Câu không thuộc đề của phiên → 400. Phiên đã nộp hoặc đã quá ân hạn → 409 `SESSION_ENDED`.
- Trả `{saved_at, server_now, ends_at, remaining_seconds}`. Mỗi lần lưu cập nhật `last_seen_at`. Không ghi sự kiện cho lần lưu.

Web: lưu sau 1,5 giây kể từ thay đổi cuối và mỗi 15 giây nếu còn thay đổi chưa lưu. Đồng thời giữ bản sao ở `localStorage` theo `session_id`; mất mạng thì báo "Mất kết nối — bài vẫn được giữ trên máy này" và gửi lại khi có mạng.

### 5.5 Sự kiện và chống gian lận

Mức "ghi log + cảnh báo", không khóa màn hình, không chặn copy.

`POST /attempt-sessions/{id}/events {type}`, chỉ khi phiên `in_progress`:

| `type` | Client gửi khi | Ghi log |
|---|---|---|
| `heartbeat` | Mỗi 20 giây khi tab mở | Không — chỉ cập nhật `last_seen_at` |
| `focus_lost` | `visibilitychange` sang ẩn hoặc cửa sổ mất focus (gộp trong 1 giây) | Có, tăng `focus_lost_count` |
| `focus_back` | Quay lại tab | Có |
| `offline` / `online` | Sự kiện mạng của trình duyệt (`offline` gửi bù khi có mạng lại, kèm `occurred_at` của client trong `detail`) | Có |

Server tự ghi: `started`, `resumed`, `submitted`, `auto_submitted`, `forced_submitted`, `extended`. Giới hạn 60 sự kiện mỗi phút mỗi phiên (429 `RATE_LIMITED`).

Phía sinh viên: khi quay lại sau `focus_lost`, hiện cảnh báo rõ ràng "Bạn vừa rời khỏi trang làm bài (lần thứ n). Hành động này đã được ghi lại." Giảng viên thấy số lần rời trang, trạng thái kết nối và dòng thời gian sự kiện trên màn giám sát. Được coi là **mất kết nối** khi `last_seen_at` cũ hơn 45 giây.

### 5.6 Nộp, tự nộp, thu bài, gia hạn

- **Nộp**: `POST /attempt-sessions/{id}/finish {answers?}`. `answers` (tùy chọn, dạng như §5.4) được lưu trước rồi mới chấm. Nộp lại một phiên đã nộp trả 200 với kết quả cũ (idempotent). Quá ân hạn → 409 `SESSION_ENDED`; khi đó server sẽ tự nộp bằng bài đã lưu.
- **Tự nộp**: scheduler chạy mỗi 5 giây, lấy tối đa 100 phiên `in_progress` có `ends_at + 5s < now` và nộp bằng câu trả lời đã lưu (`submit_reason = timeout`). Không phụ thuộc trình duyệt.
- **Thu bài**: `POST /attempt-sessions/{id}/force-submit {reason}` (giảng viên phụ trách/admin, audit `session.force_submit`).
- **Gia hạn**: `POST /attempt-sessions/{id}/extend {minutes: 1–120, reason}` cộng vào `extra_minutes`. Chỉ áp dụng cho phiên `in_progress`; được phép vượt `closes_at`. Audit `session.extend`, ghi sự kiện `extended`.

**Chống nộp hai lần**: mọi đường nộp chuyển trạng thái bằng câu lệnh có điều kiện (`… WHERE id = ? AND status = 'in_progress'`). Chỉ đường nào đổi được đúng 1 dòng mới chấm bài.

**Chấm khi nộp**, trong cùng giao dịch với chuyển trạng thái:

1. Tạo `assignment_attempts`: `attempt_no` của phiên, không muộn, phạt 0, `idempotency_key` UUID mới.
2. Mỗi câu khách quan trong đề: tạo `submissions` gắn lượt, chấm bằng `ObjectiveGrader` như nộp quiz. Câu bỏ trống được 0 điểm.
3. Mỗi câu lập trình **có code không rỗng**: tạo submission code gắn lượt và `grading_jobs` với **priority 10**. Code rỗng thì không tạo submission (0 điểm).
4. `attempt.score` = tổng điểm các submission đã có điểm. Mỗi khi một submission code của lượt chấm xong (kể cả chấm lại), API tính lại `attempt.score`.
5. Gắn `assignment_attempt_id` vào phiên. Ghi sự kiện, audit `session.submit` với lý do nộp.

## 6. Kết quả, xem lại, sổ điểm

- `GET /assignments/{id}/results`: bài giao theo phiên tính theo lượt như quiz. `max_score` = tổng điểm một đề (mọi đề bằng nhau theo §3.4). `questions` chỉ liệt kê câu cố định có mặt ở mọi đề, vì câu bốc ngẫu nhiên khác nhau giữa sinh viên. Điểm từng câu của một sinh viên xem ở trang xem lại lượt.
- `QuizAttemptView` thêm `session_id`, `paper_code`, `submit_reason`. Xem lại một lượt (`AttemptReview`) đọc đúng câu và thứ tự theo `question_order` của phiên; câu lập trình hiện verdict/điểm và link sang bài nộp.
- Chính sách xem lại như `assessment-spec.md` §6. Kỳ thi mặc định `after_close`.
- Sổ điểm: không đổi. Điểm `midterm`/`final` lấy từ các kỳ thi đã đóng, ghi đè tay vẫn được ưu tiên. Còn code đang chấm → tạm tính.

## 7. Giám sát (giảng viên)

`GET /assignments/{id}/sessions` (giảng viên phụ trách/admin; web poll mỗi 5 giây) trả:

```
{
  summary: {total, not_started, in_progress, submitted, offline},
  items: [{
    student_id, student_full_name, student_code, session_id | null,
    status: not_started | in_progress | submitted,
    attempt_no, paper_code, started_at, ends_at, remaining_seconds,
    answered_count, question_count, focus_lost_count, last_seen_at, online,
    submit_reason, score, max_score, grading_pending
  }]
}
```

Mỗi sinh viên ghi danh active có một dòng, lấy phiên mới nhất. Quiz nhiều lượt cũng chỉ hiện lượt mới nhất.

`GET /attempt-sessions/{id}/events` (giảng viên): mảng `{type, occurred_at, detail}` theo thời gian.

## 8. Màn hình (web)

| Route | Ai | Nội dung |
|---|---|---|
| tab "Kỳ thi" của lớp | Cả hai | Danh sách bài `midterm`/`final` (giảng viên kèm nháp), trạng thái Sắp mở / Đang mở / Đã đóng. Kỳ thi không xuất hiện ở tab Bài tập |
| `/assignments/:id` (bài giao theo phiên) | Sinh viên | Trang thông tin: thời lượng, khung giờ, số câu, tổng điểm, quy chế, ô xác nhận, nút "Bắt đầu làm bài" / "Tiếp tục làm bài", lịch sử lượt |
| `/attempt-sessions/:id` | Sinh viên | **Phòng thi**, toàn màn hình, không sidebar (§8.1) |
| `/assignments/:id/edit` | Giảng viên | Thêm mục "Thời gian & cách giao đề" và trình dựng **Cấu trúc đề** (§8.2) |
| `/assignments/:id/papers` | Giảng viên | Xem trước đề / từng mã đề / đề mẫu + kích thước kho; nút "Bốc lại" khi còn nháp |
| `/assignments/:id/monitor` | Giảng viên | Giám sát (§8.3) |

### 8.1 Phòng thi

- **Thanh trên** (cố định):
  - tên bài, mã đề;
  - đồng hồ đếm ngược `mm:ss`, chuyển màu cảnh báo khi còn 5 phút, đỏ khi còn 1 phút;
  - trạng thái lưu: "Đã lưu lúc hh:mm:ss" / "Đang lưu…" / "Mất kết nối";
  - nút **Nộp bài**.
- **Cột trái**: lưới số câu nhóm theo phần, với trạng thái đã làm / chưa làm / đánh dấu xem lại (đánh dấu chỉ lưu trên máy) và câu đang xem.
- **Nội dung**:
  - câu khách quan: một câu mỗi trang, có Trước/Sau;
  - câu lập trình: đề bên trái, editor bên phải (dùng lại workspace code), có "Chạy thử" với test mẫu (`practice_run`, chỉ khi phiên đang mở).
- **Nộp**: hộp xác nhận nhỏ nêu số câu chưa làm. Hết giờ thì client gọi nộp; nếu bị từ chối vì quá giờ, hiện "Hết giờ — bài đã được hệ thống thu".
- **Sau khi nộp**: trang "Đã nộp bài". Có điểm nếu chính sách xem lại cho phép, không thì ghi "Kết quả sẽ được công bố sau". Có link xem lại khi được phép.

### 8.2 Trình dựng cấu trúc đề

- **Mục "Thời gian & cách giao đề"**: thời lượng (phút), chế độ giao đề (3 lựa chọn dạng thẻ có mô tả), số mã đề, quy chế (markdown).
- **Danh sách phần**: thêm, đổi tên, xóa, sắp thứ tự.
- **Mỗi phần**: bảng mục. Mỗi dòng là một câu cố định (nội dung rút gọn, loại, độ khó, điểm) hoặc một quy tắc ("Ngẫu nhiên 10 câu · Socket · Dễ · Trắc nghiệm 1 đáp án · 0,5 đ/câu", kèm kích thước kho hiện tại).
- **Nút trong phần**: "Chọn câu" (sheet chọn câu hiện có), "Thêm quy tắc", "Ma trận đề" (bảng danh mục × độ khó, nhập số câu từng ô).
- **Mode `variants`**: thanh chọn "Chung mọi mã đề | Đề 101 | Đề 102 …". Mục thêm khi đang chọn một mã đề thì chỉ thuộc mã đó.
- **Bảng tóm tắt**: số câu và tổng điểm của từng đề (mỗi mã), cảnh báo kho thiếu hoặc tổng điểm lệch. Nút "Xem trước đề".

### 8.3 Giám sát

- **Ô thống kê**: chưa vào thi, đang làm, đã nộp, mất kết nối.
- **Bảng**:
  - sinh viên, mã đề, trạng thái (badge), thời gian còn lại;
  - tiến độ "12/30 câu";
  - số lần rời trang (cảnh báo khi > 0), kết nối (chấm xanh/xám);
  - điểm (hoặc "Đang chấm").
- **Hành động mỗi dòng**:
  - Gia hạn (hộp nhỏ: số phút + lý do);
  - Thu bài (xác nhận + lý do);
  - Xem sự kiện (sheet dòng thời gian).
- Lọc theo trạng thái, tìm theo tên/mã sinh viên.

## 9. Ngoài phạm vi v1

- Nộp code nhiều lần trong giờ thi và xem verdict ngay (hiện tại: chạy thử test mẫu, chấm khi nộp).
- Toàn màn hình bắt buộc, chặn copy/paste, tự nộp khi rời trang quá n lần.
- Đổi tay một câu trong mã đề đã sinh (dùng "Bốc lại" hoặc câu cố định theo mã đề).
- Cấp thêm lượt thi cho riêng một sinh viên.
