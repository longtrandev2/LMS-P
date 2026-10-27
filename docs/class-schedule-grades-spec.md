# Đặc tả lịch học, điểm danh, đơn xin nghỉ và sổ điểm

| | |
|---|---|
| Phiên bản | 1.0 — 2026-10-27 |
| Phạm vi | M2 (tín chỉ, thẻ lớp), M11 mới (lịch học & điểm danh), M8 (sổ điểm — thay bản cũ) |
| Nguồn yêu cầu | Chủ dự án, tham chiếu hệ thống S-Link (lớp tín chỉ): tab Lịch học, thống kê điểm danh, đơn xin nghỉ có minh chứng, kết quả học tập điểm hệ 10/4/chữ |
| Quan hệ | REST ở `api-spec.md` §3, §8, §11; schema ở `database-design.md` §2.2, §2.8, §2.10 |

QR điểm danh **không** thuộc v1 (đợt sau). Diễn đàn, khảo sát không thuộc phạm vi.

## 1. Học phần và lớp

- `courses.credits`: số tín chỉ 1–10, mặc định 3. Hiển thị ở header lớp, thẻ lớp, bảng điểm.
- Trang lớp có tab: **Thông tin chung · Lịch học · Bài tập · Kết quả học tập** (giảng viên thêm **Sinh viên**, **Đơn xin nghỉ**).

## 2. Buổi học (lịch học)

Mỗi lớp có danh sách buổi học. Một buổi: số thứ tự, ngày, tiết bắt đầu–kết thúc, phòng, hình thức (`in_person` trực tiếp / `online`), tiêu đề (tùy chọn), ghi chú, học liệu gắn kèm (học liệu của lớp có `session_id`), trạng thái hủy.

### 2.1 Khung tiết (giờ Việt Nam)

Tiết `n` (1–14) bắt đầu lúc `06:00 + n giờ` và kéo dài 50 phút (tiết 1 = 07:00–07:50, tiết 10 = 16:00–16:50, tiết 11 = 17:00–17:50).
Giờ của buổi = từ đầu tiết bắt đầu tới cuối tiết kết thúc. API trả `date` (ngày lịch VN), `start_period`, `end_period` và `starts_at`/`ends_at` (UTC, như quy ước chung). Múi giờ nghiệp vụ cố định `Asia/Ho_Chi_Minh`.

### 2.2 Tạo buổi

- **Sinh hàng loạt**: giảng viên nhập khoảng ngày `from`–`to` và 1–7 mẫu tuần `{weekday (1=Thứ 2 … 7=CN), start_period, end_period, room, mode}`; hệ thống tạo một buổi cho mỗi ngày khớp, đánh số theo thời gian. Có thể chọn **thay thế** các buổi chưa điểm danh hiện có hoặc **thêm vào**. Tối đa 200 buổi/lớp.
- Thêm/sửa/xóa từng buổi. Buổi đã có điểm danh không xóa được (chỉ đánh dấu hủy). Buổi hủy không tính vào thống kê và điểm chuyên cần.
- Mọi thay đổi lịch ghi audit.

## 3. Điểm danh

Trạng thái mỗi sinh viên trong một buổi: `present` (có mặt), `late` (muộn/về sớm), `excused` (vắng có phép), `absent` (vắng không phép). Chưa có bản ghi = **chưa điểm danh**.

- Giảng viên phụ trách (hoặc admin) mở một buổi → danh sách sinh viên đang học lớp → đặt trạng thái từng người hoặc "Tất cả có mặt" → lưu. Lưu lần đầu đánh dấu buổi **đã điểm danh** (`attendance_taken_at`). Sửa lại được, mọi lần sửa ghi audit.
- Thống kê (cho giảng viên theo lớp/buổi, cho sinh viên theo bản thân): tổng số buổi (không tính buổi hủy), có mặt, muộn, vắng có phép, vắng không phép, chưa điểm danh.
- Buổi đã diễn ra mà chưa điểm danh hiện nhãn "Chưa điểm danh"; không tự coi là vắng.

## 4. Đơn xin nghỉ

- Sinh viên gửi đơn cho **một buổi** của lớp mình (buổi chưa diễn ra hoặc đã diễn ra trong 7 ngày gần nhất, chưa hủy): lý do (bắt buộc, ≤ 1000 ký tự) + **một** tệp minh chứng bắt buộc (pdf/jpg/png/webp/doc/docx, ≤ 5 MB). Mỗi buổi chỉ có tối đa một đơn đang chờ hoặc đã duyệt.
- Trạng thái: `pending` → `approved` / `rejected` (giảng viên, kèm ghi chú tùy chọn) hoặc `cancelled` (sinh viên hủy khi còn chờ).
- **Duyệt** → bản ghi điểm danh của buổi đó thành `excused`, trừ khi đã là `present`/`late`. **Từ chối** không đổi điểm danh.
- Thông báo: đơn mới → giảng viên; kết quả duyệt → sinh viên. Ghi audit khi duyệt/từ chối.
- Sinh viên xem lịch sử đơn của mình trong lớp; giảng viên xem mọi đơn của lớp, lọc theo trạng thái.

## 5. Sổ điểm (M8)

### 5.1 Thành phần và trọng số

Bốn thành phần, mỗi thành phần thang 10: **Chuyên cần** (`attendance`), **Bài tập** (`assignment`), **Giữa kỳ** (`midterm`), **Cuối kỳ** (`final`).
Giảng viên đặt trọng số % cho từng lớp; tổng phải đúng 100 (mỗi trọng số 0–100, số nguyên). Mặc định 10 / 20 / 20 / 50. Đổi trọng số ghi audit.

### 5.2 Cách tính từng thành phần

| Thành phần | Điểm hệ thống |
|---|---|
| Chuyên cần | `max(0, 10 − absent × absent_penalty − late × late_penalty − excused × excused_penalty)`, chỉ tính các buổi đã điểm danh và không hủy |
| Bài tập | Trung bình `điểm/điểm tối đa × 10` của các bài đã xuất bản hạng mục `quiz` và `assignment` **đã đóng** (sau `due_at`, hoặc `late_due_at` nếu cho nộp muộn); quiz lấy lượt theo `score_policy`, bài thường cộng điểm từng câu theo `score_policy`; không nộp = 0. Bài còn mở không tính nhưng làm thành phần ở trạng thái tạm tính; bài đã đóng còn bài code đang chấm cũng tạm tính. Chưa có bài đóng nào → chưa có điểm |
| Giữa kỳ / Cuối kỳ | Điểm giảng viên nhập tay hoặc nhập CSV. Nếu chưa nhập: trung bình các bài đã đóng thuộc hạng mục `midterm`/`final` (nếu có). Khi có kỳ thi M7, điểm kỳ thi đổ vào đây |

**Ghi đè**: giảng viên có thể nhập điểm cho bất kỳ thành phần nào của một sinh viên (kèm lý do), ghi đè điểm hệ thống và điểm CSV; xóa ghi đè để quay về điểm hệ thống (mỗi thành phần chỉ lưu một điểm nhập). Mọi lần nhập/sửa/xóa ghi audit (BR7).

### 5.3 Chính sách chuyên cần (cấu hình theo lớp)

| Tham số | Ý nghĩa | Mặc định |
|---|---|---|
| `max_absences` | Số buổi nghỉ cho phép (tính cả vắng có phép và không phép); vượt quá → **không đủ điều kiện dự thi** | `floor(20% × số buổi không hủy)` khi để trống |
| `absent_penalty` | Điểm trừ mỗi buổi vắng không phép | 2 |
| `late_penalty` | Điểm trừ mỗi buổi muộn/về sớm | 0,5 |
| `excused_penalty` | Điểm trừ mỗi buổi vắng có phép | 0 |

Penalty trong khoảng 0–10, bước 0,25. Không đủ điều kiện dự thi → điểm Cuối kỳ tính 0 và tổng kết hiện trạng thái "Không đủ điều kiện dự thi". Giảng viên **ghi đè điểm Chuyên cần** của sinh viên (xét lại) thì sinh viên đó được coi là đủ điều kiện dự thi.

### 5.4 Tổng kết

- `Điểm hệ 10 = round(Σ trọng số × điểm thành phần / 100, 1)`.
- Quy đổi (thang PTIT):

| Hệ 10 | Chữ | Hệ 4 |
|---|---|---|
| 9,0 – 10 | A+ | 4,0 |
| 8,5 – 8,9 | A | 3,7 |
| 8,0 – 8,4 | B+ | 3,5 |
| 7,0 – 7,9 | B | 3,0 |
| 6,5 – 6,9 | C+ | 2,5 |
| 5,5 – 6,4 | C | 2,0 |
| 5,0 – 5,4 | D+ | 1,5 |
| 4,0 – 4,9 | D | 1,0 |
| < 4,0 | F | 0 |

- Trạng thái tổng: `final` khi cả 4 thành phần có điểm và không còn bài đang chấm; ngược lại `provisional` (tạm tính, thành phần thiếu coi như chưa có, tổng chỉ hiện khi đủ 4). "Đạt" khi chữ khác F.

### 5.5 Màn hình

- **Giảng viên — tab Kết quả học tập**: thanh cấu hình (trọng số 4 thành phần + chính sách chuyên cần, có kiểm tra tổng 100%); bảng sinh viên × (Chuyên cần · Bài tập · Giữa kỳ · Cuối kỳ · Hệ 10 · Hệ 4 · Chữ · Điều kiện dự thi); ô điểm bấm để ghi đè (có lý do), ô đã ghi đè có dấu hiệu; nhập CSV Giữa kỳ/Cuối kỳ (cột `student_code, midterm, final`, xem trước + báo lỗi từng dòng); xuất CSV.
- **Sinh viên — tab Kết quả học tập**: như ảnh tham chiếu: điểm thành phần kèm %, điều kiện dự thi, điểm cuối kỳ, khối điểm tổng kết (hệ 10, hệ 4, chữ, Đạt/Chưa đạt, tạm tính hay đã chốt).

## 6. Thẻ lớp và trang chủ sinh viên

`GET /me/classes` trả thêm cho mỗi lớp: `credits`, `total_sessions`, `held_sessions` (buổi không hủy đã qua giờ kết thúc), `attended_sessions` (present + late), `next_session_at`, `materials_count`, `open_assignments_count`, `lecturer_avatar_url`.
Thẻ lớp (tham chiếu S-Link): dòng đầu `mã lớp • mã học phần`, tên môn, ba ô số liệu (đã học/tổng buổi · học liệu · bài đang mở), "Tiếp theo: giờ buổi kế tiếp", "Tiến trình: đã diễn ra/tổng buổi" + thanh %, cuối thẻ số tín chỉ + avatar giảng viên; badge "Sắp tới" khi buổi kế tiếp bắt đầu trong 24 giờ. Màu theo `apps/web/DESIGN.md` (không dùng nền màu trang trí).

## 7. Thông báo

`session.upcoming` gửi sinh viên của lớp 30 phút trước mỗi buổi (scheduler mỗi phút, mỗi buổi gửi một lần); `leave_request.created` cho giảng viên; `leave_request.reviewed` cho sinh viên; `grade.updated` cho sinh viên khi giảng viên ghi đè điểm của họ hoặc nhập CSV có dòng của họ.
