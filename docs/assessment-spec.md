# Đặc tả câu hỏi, đề và chấm bài — v2

| | |
|---|---|
| Phiên bản | 2.0 — 2026-10-27 |
| Phạm vi | M4 (ngân hàng câu hỏi), M5 (bài tập/quiz), M6 (chấm lập trình) |
| Quan hệ | Chi tiết hóa `srs.md` FR-QB/FR-ASG/FR-GRD; hợp đồng REST ở `api-spec.md` §5–6, schema ở `database-design.md` §2.4–2.7, message ở `message-contracts.md` |

Tài liệu này là hợp đồng chung cho API, worker và web. Mọi chỗ khác mâu thuẫn với tài liệu này phải sửa theo tài liệu này.

## 1. Loại câu hỏi

Tất cả loại câu dưới đây đều chấm tự động. Câu tự luận chấm tay (essay) **không** thuộc v1.

| `type` | Tên hiển thị | Dữ liệu đáp án | Chấm |
|---|---|---|---|
| `mcq` | Một đáp án | `options` 2–8, đúng **1** | Chọn đúng lựa chọn đúng |
| `multiple_choice` | Nhiều đáp án | `options` 2–8, đúng **≥1** | `scoring_mode` (§3) |
| `true_false` | Đúng / Sai | `options` đúng 2 (`Đúng`, `Sai`), đúng 1 | Như `mcq` |
| `short_answer` | Trả lời ngắn | `answer_spec.accepted` 1–20 chuỗi | Khớp sau chuẩn hóa (§3.1) |
| `numeric` | Đáp số | `answer_spec.value`, `tolerance ≥ 0` | `|x − value| ≤ tolerance` |
| `fill_blank` | Điền vào chỗ trống | Nội dung có ô `[[1]]`…`[[n]]`, `answer_spec.blanks` n phần tử | Từng ô; `scoring_mode` |
| `matching` | Ghép cặp | `answer_spec.pairs` 2–12, `distractors` 0–6 | Từng cặp; `scoring_mode` |
| `ordering` | Sắp xếp thứ tự | `answer_spec.items` 2–12 theo thứ tự đúng | Từng vị trí; `scoring_mode` |
| `programming` | Lập trình | `programming` + `test_cases` (§4) | Verdict AC/… (§5) |

Giữ tên `mcq` cho câu một đáp án để tương thích dữ liệu cũ.

### 1.1 Trường chung

- `content`: Markdown (GFM). Web render **không cho HTML thô**. Tối đa 60.000 ký tự.
- `explanation`: Markdown, tùy chọn, tối đa 10.000 ký tự. Chỉ hiện khi chính sách xem lại cho phép (§6).
- `scoring_mode`: `all_or_nothing` | `partial`. Chỉ có ý nghĩa với `multiple_choice`, `fill_blank`, `matching`, `ordering`; loại khác luôn lưu `all_or_nothing`. Mặc định trên UI: `multiple_choice` → `all_or_nothing`; `fill_blank`/`matching`/`ordering` → `partial`.
- `difficulty`: `easy` | `medium` | `hard`. `topic` không còn dùng trên UI (giữ cột để tương thích); phân nhóm bằng danh mục.

### 1.2 `answer_spec` theo loại

ID trong `answer_spec` (`pairs[].id`, `pairs[].right_id`, `distractors[].id`, `items[].id`) là chuỗi 8 ký tự hex **ngẫu nhiên do server sinh** khi lưu nếu client không gửi. Client giữ nguyên ID nhận về khi sửa. ID không mang thông tin thứ tự.

```json
// short_answer
{"accepted": ["TCP", "Transmission Control Protocol"], "case_sensitive": false}
// numeric
{"value": 80, "tolerance": 0}
// fill_blank — content: "Server gọi [[1]]() rồi [[2]]() để nhận kết nối."
{"blanks": [{"accepted": ["listen"], "case_sensitive": false}, {"accepted": ["accept"], "case_sensitive": false}]}
// matching
{"pairs": [{"id": "a1b2c3d4", "left": "HTTP", "right": "80", "right_id": "9f8e7d6c"}],
 "distractors": [{"id": "0a0b0c0d", "text": "8080"}]}
// ordering — thứ tự mảng là thứ tự đúng
{"items": [{"id": "11aa22bb", "text": "socket()"}, {"id": "33cc44dd", "text": "bind()"}]}
```

Ràng buộc: chuỗi đáp án ≤ 200 ký tự; `left`/`right`/`text` ≤ 500 ký tự; text bên phải của matching (kể cả distractor) không trùng nhau; item ordering không trùng nhau; số ô trong `content` phải bằng `blanks.length` và đánh số liên tục từ 1.

Câu `true_false`: server luôn lưu 2 lựa chọn theo thứ tự `Đúng`, `Sai`; client chỉ gửi lựa chọn nào đúng.

## 2. Phiên bản và lưu câu hỏi

- Tạo/sửa câu hỏi là **một request, một transaction**: `POST /questions` và `PATCH /questions/{id}` nhận cả `options`, `answer_spec`, `explanation`, `scoring_mode`, `programming`, `test_cases`. `PUT /questions/{id}/test-cases` giữ lại để tương thích.
- Mỗi lần lưu tạo **một** `question_versions` mới, trừ khi snapshot mới giống hệt bản mới nhất (khi đó không tạo version).
- Snapshot (`question_versions.snapshot`) chứa toàn bộ dữ liệu để hiển thị và chấm:

```json
{
  "type": "multiple_choice", "content": "...", "topic": null, "difficulty": "medium",
  "explanation": "...", "scoring_mode": "partial",
  "options": [{"id": 11, "content": "...", "is_correct": true, "position": 0}],
  "answer_spec": null,
  "programming": null,
  "test_cases": []
}
```

Snapshot cũ thiếu trường mới được đọc với giá trị mặc định: `explanation=null`, `scoring_mode=all_or_nothing`, `answer_spec=null`, `checker_mode=token`, `starter_codes` suy từ `starter_code`.

## 3. Chấm câu khách quan

Mỗi câu cho ra tỉ lệ `f ∈ [0, 1]`. Điểm câu = `round(points × f × (100 − late_penalty_percent) / 100, 2)`. Câu bỏ trống: `f = 0`.

| Loại | `f` |
|---|---|
| `mcq`, `true_false` | 1 nếu chọn đúng một lựa chọn đúng |
| `multiple_choice` · `all_or_nothing` | 1 nếu tập chọn = tập đúng |
| `multiple_choice` · `partial` | `max(0, |S∩C|/|C| − |S∖C|/|W|)`; `S` đã chọn, `C` đúng, `W` sai (nếu `W` rỗng thì vế sau = 0) |
| `short_answer` | 1 nếu khớp một đáp án chấp nhận |
| `numeric` | 1 nếu `|x − value| ≤ tolerance` |
| `fill_blank` | `all_or_nothing`: 1 nếu mọi ô đúng; `partial`: số ô đúng / n |
| `matching` | `all_or_nothing`: 1 nếu mọi cặp đúng; `partial`: số cặp đúng / số cặp |
| `ordering` | `all_or_nothing`: 1 nếu đúng toàn bộ; `partial`: số vị trí đúng / n |

### 3.1 Chuẩn hóa chuỗi

Áp cho `short_answer` và `fill_blank`: Unicode NFC → bỏ khoảng trắng hai đầu → gộp chuỗi khoảng trắng liên tiếp thành 1 dấu cách → nếu `case_sensitive=false` thì chuyển chữ thường (`Locale.ROOT`). Không bỏ dấu tiếng Việt.

### 3.2 Câu trả lời (request)

Cùng một hình dạng cho quiz và bài nộp từng câu. Chỉ gửi trường đúng loại; gửi trường của loại khác → 400 `VALIDATION_ERROR`.

```json
{"question_id": 55,
 "selected_option_ids": [11, 13],          // mcq, multiple_choice, true_false
 "text": "TCP",                            // short_answer, ≤ 1000 ký tự
 "number": 80.5,                           // numeric
 "blanks": ["listen", "accept"],           // fill_blank, đúng n phần tử (chuỗi rỗng = bỏ trống ô)
 "matches": {"a1b2c3d4": "9f8e7d6c"},      // matching: left id → right id
 "order": ["33cc44dd", "11aa22bb"]}        // ordering: hoán vị đầy đủ các item id
```

Server lưu câu trả lời đã chuẩn hóa vào `submissions.response` (JSON, không có `question_id`); câu lựa chọn lưu thêm `selected_option_ids` như cũ.

## 4. Câu lập trình

| Trường | Ràng buộc | Mặc định UI |
|---|---|---|
| `allowed_languages` | Bắt buộc, ⊆ {`python`,`c`,`cpp`,`java`}, ≥ 1 | Cả 4 |
| `time_limit_ms` | 100–10.000 | 1000 |
| `memory_limit_mb` | 32–1024 | 256 |
| `checker_mode` | `token` \| `line` \| `float` | `token` |
| `checker_epsilon` | 1e-12–1, chỉ dùng với `float` | 1e-6 |
| `starter_codes` | Map ngôn ngữ → code, mỗi bản ≤ 64 KiB | Mẫu đọc stdin theo ngôn ngữ |
| `solution_code` | ≤ 128 KiB | — |
| `solution_language` | Bắt buộc khi có `solution_code`, thuộc `allowed_languages` | — |
| `test_cases` | 1–100 test; `input` ≤ 128 KiB, `expected_output` ≤ 64 KiB, tổng ≤ 2 MiB | Test mới là **Ẩn** |

- Test công khai (`is_public=true`) là **ví dụ mẫu**, hiện cho sinh viên trong đề. Test ẩn không bao giờ trả input/expected/output cho sinh viên (BR4).
- `weight` không dùng (chấm nhị phân); API bỏ qua giá trị gửi lên.
- Ngôn ngữ và trình biên dịch: Python 3.12, C (gcc, C17), C++ (g++, C++20), Java 21 (class `Main`, file `Main.java`). Chương trình đọc stdin, ghi stdout.
- Hệ số thời gian: C/C++ ×1, Java ×2, Python ×2 (giới hạn thực = `time_limit_ms` × hệ số).

### 4.1 Checker

| `checker_mode` | So sánh |
|---|---|
| `token` | Tách cả hai theo khoảng trắng (space, tab, xuống dòng), so dãy token bằng nhau |
| `line` | Đổi CRLF→LF, bỏ khoảng trắng cuối mỗi dòng, bỏ các dòng trống cuối; so từng dòng (khoảng trắng đầu dòng có ý nghĩa) |
| `float` | Như `token`; cặp token đều là số thực hữu hạn thì đạt nếu `|a−b| ≤ ε` hoặc `|a−b| ≤ ε·|b|`, ngược lại so chuỗi |

Snapshot cũ không có `checker_mode` chấm bằng `token` (lỏng hơn cách cũ, chấm lại chỉ có thể đổi WA thành AC).

## 5. Chấm lập trình

- Worker biên dịch một lần, chạy lần lượt các test (công khai trước, theo `position`) trong **một container cho mỗi job**, dọn `/tmp` giữa các test. Bài nộp chính thức **dừng ở test sai đầu tiên** (kiểu Codeforces).
- Verdict từng test: `AC`, `WA`, `TLE`, `MLE`, `RE`, `OLE` (stdout > 64 KiB). Verdict tổng: `AC` nếu mọi test đạt; `CE` nếu biên dịch lỗi; nếu không là verdict của test sai đầu tiên.
- `SYSTEM_ERROR` (status `failed`) chỉ cho lỗi hạ tầng: Docker lỗi, job quá thời gian tổng `max(60 s, Σ giới hạn test × 1,5 + 30 s)`, không đọc được job. Không phải lỗi của sinh viên.
- **Điểm**: `AC` → `points × (100 − late_penalty_percent) / 100`; verdict khác → 0; `failed` → `score = NULL`.
- **Lượt**: submission `failed` không tính vào `max_attempts`.
- Kết quả từng test được lưu ở `test_results` (chỉ các test đã chạy). Sinh viên thấy: vị trí, verdict, thời gian, cờ công khai; input/expected/output **chỉ của test công khai**. Giảng viên thấy đủ (output đã cắt 4 KiB).
- **Chấm lại** (giảng viên phụ trách/admin, nhập lý do): tạo grading job mới với `attempt_no + 1`, đưa submission về `pending`, giữ lịch sử kết quả (BR8), ghi audit `submission.regrade`. Điểm theo kết quả mới nhất.
- Kiểm tra khi **nộp** chỉ gồm: ngôn ngữ thuộc snapshot, code không rỗng ≤ 128 KiB. Kiểm tra đầy đủ đề (§4) chỉ chạy khi **xuất bản**, để siết luật không khóa bài đã xuất bản.

## 6. Bài tập, quiz, xem lại

Thêm vào `assignments`:

| Trường | Giá trị | Mặc định | Sửa sau xuất bản |
|---|---|---|---|
| `review_mode` | `never` \| `after_submit` \| `after_close` | `after_close` | Có (kèm lý do, audit) |
| `review_shows_answers` | bool — khi được xem lại, có hiện đáp án đúng + giải thích không | `true` | Có |
| `shuffle_questions` | bool | `false` | Không |
| `shuffle_options` | bool (chỉ `mcq`, `multiple_choice`) | `false` | Không |

- "Đóng" = `late_due_at` nếu cho nộp muộn, ngược lại `due_at`.
- Trước khi được xem lại: sinh viên chỉ thấy **tổng điểm lượt** (quiz) hoặc "đã nộp" (câu khách quan nộp từng câu). Khi được xem lại: điểm từng câu, câu trả lời của mình, và nếu `review_shows_answers` thì đáp án đúng + giải thích.
- Bài code: verdict và kết quả test công khai luôn hiện ngay (chuẩn CP), không phụ thuộc `review_mode`.
- `category=quiz`: mọi loại câu trừ `programming`. Hạng mục khác: mọi loại câu.
- UI mặc định `max_attempts = 1`.

### 6.1 Trộn đề

- Seed = 8 byte đầu SHA-256 của `"{assignment_id}:{student_id}:{n}"`, với `n` = số lượt quiz đã nộp + 1 (quiz) hoặc 0 (bài nộp từng câu). Chỉ API tính seed.
- `shuffle_questions`: hoán vị thứ tự câu. `shuffle_options`: hoán vị lựa chọn của `mcq`/`multiple_choice`.
- `matching` (cột phải) và `ordering` (danh sách item) **luôn** được trộn; nếu hoán vị trùng thứ tự đúng thì xoay vòng 1 vị trí.
- Chấm theo ID nên trộn không ảnh hưởng điểm. Màn xem lại hiện theo đúng thứ tự sinh viên đã thấy.

### 6.2 Bốc đề ngẫu nhiên

`POST /questions/draw` nhận danh sách quy tắc (ngân hàng, danh mục?, độ khó?, loại?, số câu), trả câu hỏi bốc ngẫu nhiên không lặp từ các ngân hàng người dùng được xem, cùng thông báo quy tắc nào thiếu câu. Kết quả **điền vào danh sách câu của bản nháp**; giảng viên xem, đổi, xóa trước khi xuất bản. Bốc lúc soạn cho ra một đề chung. Quy tắc bốc lưu trong đề, nhiều mã đề, đề riêng từng sinh viên và quiz giới hạn thời gian: `exam-spec.md`.

## 7. Job chạy thử (run jobs)

Dùng chung cho kiểm tra đề và chạy thử; không tạo submission, không tính lượt/điểm.

| `kind` | Ai gọi | Chạy gì | Test | Output trả về |
|---|---|---|---|---|
| `problem_check` | Người sửa được câu hỏi | `solution_code` của **phiên bản mới nhất đã lưu** | Mọi test, không dừng sớm | ≤ 4 KiB/test |
| `draft_check` | Người sửa được ngân hàng | Code + test gửi trong request (form chưa lưu) | Mọi test; test thiếu expected chỉ lấy output | ≤ 64 KiB/test |
| `practice_run` | Sinh viên của lớp, bài đang mở | Code sinh viên | Test công khai của phiên bản đã ghim, hoặc một input tự nhập | ≤ 64 KiB/test |

- Verdict từng test như §5, thêm `OK` cho test không có expected (chạy xong, không lỗi). Verdict tổng: `AC` nếu mọi test `AC`/`OK`, `CE`, `SYSTEM_ERROR`, hoặc verdict của test lỗi đầu tiên.
- `practice_run` giới hạn 6 lần/phút/sinh viên (429 `RATE_LIMITED`).
- **Chặn xuất bản**: khi xuất bản bài có câu lập trình, API xét `problem_check` mới nhất của đúng `question_version_id` sẽ ghim:
  - verdict khác `AC` → 409 `PROBLEM_CHECK_FAILED` (không vượt qua được);
  - chưa có, đang chạy, lỗi hệ thống hoặc câu không có lời giải → 409 `PROBLEM_UNVERIFIED`, trừ khi request có `confirm_unverified=true` (ghi audit `assignment.publish_unverified`).

## 8. Màn hình (web)

Quiz, bài code, soạn câu hỏi, soạn đề và xem bài nộp là **trang riêng**, không dùng dialog.

| Route | Ai | Nội dung |
|---|---|---|
| `/questions/new`, `/questions/:id/edit` | GV | Chọn loại (thẻ), form theo loại, xem trước như sinh viên |
| `/classes/:classId/assignments/new`, `…/:id/edit` | GV | Thông tin · Lịch & lượt · Xem lại & trộn · Câu hỏi (chọn tay, bốc ngẫu nhiên, tổng điểm + chia đều) |
| `/classes/:classId/assignments/:id/results` | GV | Kết quả theo sinh viên; danh sách bài nộp code |
| `/submissions/:id` | Chủ bài / GV | Code, verdict, bảng test, log biên dịch, lịch sử chấm, chấm lại (GV) |
| `/me/classes/:classId/assignments/:id` | SV | Tổng quan bài, lịch sử lượt, bắt đầu làm; bài thường: danh sách câu |
| `/me/classes/:classId/assignments/:id/attempt` | SV | Làm quiz: thanh tiến độ, lưới câu, đánh dấu, nháp tự lưu, xác nhận nộp |
| `/me/classes/:classId/assignments/:id/attempts/:attemptId` | SV | Kết quả + xem lại theo chính sách |
| `/me/classes/:classId/assignments/:id/problems/:questionId` | SV | Workspace code: đề/ví dụ/lịch sử bên trái, editor + chạy thử + nộp bên phải |

Editor code: CodeMirror 6 (đóng gói cùng bundle, chạy được khi không có Internet). Nháp đáp án/code lưu `localStorage` theo `(user, assignment, question)`.
