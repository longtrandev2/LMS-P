# DESIGN.md — LMS-P Web (v3)

Nguồn chân lý về giao diện. `docs/ui-design.md` chỉ tóm tắt và trỏ về đây.

## 0. Hướng thiết kế

Bám **Frappe LMS** (dùng `frappe-ui`, MIT) và **ClassroomIO** — hai LMS mã nguồn mở có giao diện sản phẩm thật, đã xem ảnh chụp
và lấy token gốc của frappe-ui (2026-10-27). Cảm giác: nền trắng sáng sủa, sidebar xám rất nhạt, chữ đen rõ, nút xám đặc, ít viền,
phân cấp bằng cỡ chữ và khoảng trắng; dữ liệu là nhân vật chính. Không có trang marketing: `/` chuyển thẳng vào ứng dụng.

Cấm: landing/hero/feature-grid, dữ liệu minh họa bịa, khung viền bọc mọi khối, khung lồng khung, nút đỏ, gradient, icon trong
bong bóng màu, chữ UPPERCASE, emoji, bóng đổ dày, căn giữa cả trang ứng dụng.

## 1. Token (`src/app/design-tokens.css`, theo frappe-ui)

| Token | Light | Dùng |
|---|---|---|
| `--background`/`--card` | trắng | vùng nội dung |
| `--sidebar` | gray-50 `oklch(0.979 0 0)` | sidebar, nền trang đăng nhập, header phụ |
| `--secondary`/`--muted` | gray-100 `0.964` | nền nút phụ, ô nhập, thanh lựa chọn, badge trung tính |
| `--accent` | gray-200 `0.946` | hover |
| `--border` / `--input` | gray-200 / gray-300 | viền 1px (dùng tiết kiệm) |
| `--foreground` | gray-900 `0.205` | chữ chính, nút chính |
| `--muted-foreground` | gray-600 `0.586` | chữ phụ, nhãn |
| `--success` / `--destructive` / `--warning` / `--info` | green-700 / red-600 / amber-700 / blue-700 | chỉ cho trạng thái |

`--cta` giữ tên nhưng = đen (không còn nút đỏ). Đổ bóng `shadow-sm|shadow|md|lg|xl` = elevation của frappe-ui (dùng cho mục
sidebar đang chọn, popover, dialog, khối nổi duy nhất của trang như form đăng nhập). Radius: control 8px (`rounded-md`),
panel 12–14px (`rounded-xl`). Dark mode theo thang tối của frappe-ui.

## 2. Chữ

- **Inter Variable** (đóng gói `@fontsource-variable/inter`, có đủ dấu tiếng Việt), body 14px weight 420, letter-spacing 0.01em;
  **Geist Mono** cho code, mã lớp/SV, số căn cột.
- Tiêu đề trang 24/600; tiêu đề section 16/600; tiêu đề khối 14/600; body 14; meta 13/12 `text-muted-foreground`.
- Số trong bảng `tabular-nums`. Không uppercase.

## 3. Khung (đã làm — `components/app-shell.tsx`, `nav-sidebar.tsx`, `user-menu.tsx`, `app-breadcrumb.tsx`)

- Sidebar 240px nền `--sidebar`, thu gọn còn 56px (lưu localStorage). Đầu sidebar: khối workspace (logo + "LMS-P" + tên người dùng,
  bấm mở menu Hồ sơ / Giao diện / Đăng xuất). Mục: icon 16px + nhãn 14px; **đang chọn = ô trắng `shadow-sm`**; hover `bg-accent`.
- Topbar 48px: breadcrumb tên thật (`Lớp phụ trách / Lập trình mạng — Lớp 1 / Quiz tổng hợp`) mục cha xám, mục cuối đậm, ngăn bằng
  `/`; bên phải chỉ có chuông. Header dính trong trang dùng `sticky top-12`.
- Nội dung `max-w-5xl` căn giữa, padding 32px; trang làm việc (soạn, làm quiz, workspace code, kết quả) tràn rộng.

## 4. Pattern trang (theo ảnh Frappe LMS / ClassroomIO)

| Pattern | Cách làm |
|---|---|
| **Đầu trang** | Tiêu đề 24/600; dưới là **hàng meta** gồm các mục `icon 16px + chữ` ngăn bằng dấu `·` (ví dụ `▤ 8 câu · 🕑 Hạn 01/11 23:59 · ↻ 2 lượt`); hành động bên phải: một nút đen + nút xám. Không bọc trong khung |
| **Danh sách** | Không khung ngoài. Thanh công cụ (tìm kiếm nền xám, bộ lọc Select xám, nút) → các hàng ngăn bằng `border-b`, hàng cao 48–56px: icon/loại · tiêu đề 14/500 + meta 12 xám · trạng thái (badge tô nhạt) · chevron hoặc menu `…`; hover `bg-secondary/60`. Bảng dữ liệu dùng `ui/table` cùng phong cách (header 12 xám, không nền) |
| **Panel phụ** (kiểu thẻ "Manage Batch" của Frappe) | Chỉ dùng cho khối tóm tắt/hành động bên phải: `rounded-xl border p-5`, nội dung dạng danh sách `icon + chữ`, nút đen full-width + nút xám full-width |
| **Trang lớp của sinh viên** (kiểu trang khóa học Frappe) | Cột chính: đầu trang lớp + tab gạch chân (Tổng quan / Học liệu / Bài tập). Cột phải 320px, viền trái, nền `--sidebar`: tiêu đề lớp, "x% hoàn thành" + thanh tiến độ mảnh đen, danh sách bài theo nhóm (Đang mở / Sắp mở / Đã đóng) mỗi dòng `icon loại + tên + ✓ nếu đã nộp`, dòng đang xem nền `bg-accent` |
| **Trang lớp của giảng viên** | Đầu trang lớp (mã mono · học kỳ · sĩ số · lịch dạng hàng meta) + tab gạch chân (Tổng quan / Học liệu / Bài tập / Sinh viên); nội dung tab là danh sách theo pattern trên |
| **Trang chủ** | "Sắp đến hạn" là danh sách hàng (không khung), mỗi hàng: loại · tên · lớp · "còn x ngày" (cam khi < 24h). Lớp học là lưới thẻ gọn `rounded-xl border p-4`: mã mono, tên 15/600, meta xám, số bài đang mở |
| **Làm quiz** (kiểu quiz Frappe) | Khung câu `rounded-xl border p-6` rộng tối đa 720px; đầu khung `Câu 1 · Một đáp án` (xám) + `1,25 điểm` (phải, đậm); đề 15/500; **lựa chọn = thanh `bg-secondary rounded-lg px-4 py-3` có radio/checkbox**, hover `bg-accent`, đã chọn `bg-accent` + viền 1px `--foreground`; chân khung `Câu 1/8` + nút xám Trước/Sau. Trên cùng một dải thông tin nền `info/8` chữ `info` ("Quiz gồm 8 câu · được làm 2 lượt · xem đáp án ngay sau khi nộp"). Bên phải: panel lưới số câu + nút Nộp bài (đen) |
| **Trang soạn** (câu hỏi, bài) | Header dính `sticky top-12` nền trắng viền dưới: quay lại · tiêu đề · trạng thái lưu · nút xám phụ · nút đen Lưu. Thân: các section ngăn bằng tiêu đề 16/600 + mô tả xám, field theo lưới 2 cột; xem trước nằm ở panel phụ bên phải |
| **Workspace code** | Tràn màn, hai cột ngăn bằng viền: trái đề (tab Đề bài / Bài nộp), phải editor; thanh hành động: Select ngôn ngữ · nút xám "Chạy thử" · nút đen "Nộp bài"; kết quả dưới editor dạng danh sách test (verdict badge tô nhạt) |
| **Chi tiết bài nộp** | Đầu trang: verdict lớn + hàng meta (điểm · ngôn ngữ · thời điểm · lượt); dưới: code chỉ đọc, danh sách test, log |

## 5. Thành phần

- Nút (`ui/button`): `default`/`cta` đen đặc cho hành động chính (tối đa 1 mỗi vùng); `outline`/`secondary` xám đặc cho phụ;
  `ghost` cho icon/menu; `destructive` đỏ chỉ trong xác nhận xóa. Cao 32px (`sm` 28px, `lg` 36px).
- Ô nhập/Select/Textarea: nền xám không viền, focus nền trắng + vòng xám.
- Badge: nền tô nhạt cùng màu chữ, không viền (`success`, `warning`, `destructive`, `info`, `default` xám, `solid` đen).
- Verdict: `VerdictBadge` (AC xanh, WA/RE/CE đỏ, TLE/MLE/OLE cam, SE xám).
- Tab trang: `TabsList variant="line"`. Lọc/chế độ xem: segmented (`variant="default"`).
- Trạng thái: skeleton đúng hình → empty state (icon xám 20px + một câu + một hành động, không khung) → lỗi + "Thử lại".
- Xác nhận phá hủy: `AlertDialog`.

## 6. Truy cập & chuyển động

Focus ring 2px thấy rõ; mọi input có label; icon-only có `aria-label`; tương phản ≥ 4.5:1; chỉ `transition-colors` 150ms;
tôn trọng `prefers-reduced-motion`. Route tải lười (mỗi trang một chunk).

## 7. Logo

Ô vuông bo góc màu `--foreground` chứa 3 thanh cao dần màu `--background`; wordmark "LMS-P" Inter 600.
