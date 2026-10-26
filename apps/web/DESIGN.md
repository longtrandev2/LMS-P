# DESIGN.md — LMS-P Web

Nguồn chân lý về giao diện. `docs/ui-design.md` chỉ tóm tắt và trỏ về đây.

## 0. Hướng thiết kế

**Monochrome product** kiểu Linear/Vercel: dày thông tin, gọn, viền 1px, phân cấp bằng tông nền + chữ, không trang trí.
Tham chiếu pattern (2026-10-27): LearnHouse (workspace khóa học, Next/Tailwind/Radix), ClassroomIO và Frappe LMS
(dashboard gọn, cổng sinh viên), Canvas/Open edX (tab theo lớp, danh sách "sắp đến hạn"), DMOJ/Codeforces/HackerRank
(trang đề, bảng bài nộp, verdict). Lấy cấu trúc và mật độ, **không** sao chép thương hiệu/màu của họ.

Màu chỉ có 3 vai trò:
- **Trung tính (thang zinc)**: nội dung, bề mặt, viền, nút thường (đen ở light, trắng ở dark).
- **Đỏ CTA** (`--cta`): đúng **một** hành động chính mỗi màn (Lưu, Nộp bài, Xuất bản…) và vạch active ở sidebar.
- **Trạng thái**: `--success` (đạt/AC), `--destructive` (lỗi/sai/xóa), `--warning` (TLE/MLE, muộn, sắp hết hạn).

Cấm: xanh ngọc/teal, gradient, serif display, nền kem/vàng đồng, icon trong bong bóng màu, eyebrow UPPERCASE,
số liệu bịa, tên công nghệ trên UI, emoji làm icon, card lồng card, bóng đổ dày.

## 1. Token (`src/app/design-tokens.css`, `globals.css`)

| Token | Light | Dark | Dùng |
|---|---|---|---|
| `--background` | zinc-50 `oklch(0.985 0 0)` | zinc-950 | nền canvas |
| `--card` | trắng | zinc-925 | bề mặt nổi (panel, bảng) |
| `--foreground` | zinc-950 | zinc-100 | chữ chính |
| `--muted-foreground` | zinc-500 | zinc-400 | chữ phụ, meta |
| `--border` / `--input` | zinc-200 / zinc-300 | zinc-800 / zinc-700 | viền 1px |
| `--primary` | zinc-900 | zinc-100 | nút thường, link mạnh |
| `--cta` | red-600 | red-500 | hành động chính |
| `--success` / `--destructive` / `--warning` | green-700 / red-600 / amber-700 | green-500 / red-400 / amber-400 | trạng thái |

`--gold` là tên cũ = `--warning`. Radius `--radius: 10px` (card), control 8px. Không dùng màu hex trực tiếp trong component.

## 2. Chữ

- **Be Vietnam Pro** (đóng gói `@fontsource`, 400/500/600/700) cho mọi chữ; **Geist Mono** cho code, mã lớp/SV, số liệu căn cột, verdict.
- Thang: tiêu đề trang 24/600 (`text-2xl font-semibold tracking-tight`), tiêu đề section 16/600, body 14/400, meta 12–13/500 `text-muted-foreground`.
- Số trong bảng: `tabular-nums`. Không uppercase rộng chữ; nhãn section viết kiểu câu.

## 3. Mật độ & khoảng cách

- Lưới 4px. Control cao 36px (`h-9`), nút nhỏ 32px. Hàng bảng 40–44px.
- Trang: padding 24px (mobile 16px), nội dung `max-w-6xl`; trang làm việc (editor, workspace, làm quiz) được tràn rộng.
- Panel: `rounded-xl border bg-card`, padding 16–20px, **không shadow** (shadow chỉ cho popover/dialog/dropdown).
- Phân tách nhóm bằng tiêu đề section + khoảng trắng, không bọc mọi thứ trong card.

## 4. Khung ứng dụng

```
┌ Sidebar 240px ┐┌ Topbar 56px: breadcrumb ···················· chuông · theme · avatar ┐
│ Logo          ││ Page header: tiêu đề + mô tả ngắn ·················· hành động         │
│ Nhóm theo vai ││ Nội dung                                                            │
│ ▌mục active   ││                                                                     │
│ …             ││                                                                     │
│ Hồ sơ/đăng xuất││                                                                     │
└───────────────┘└─────────────────────────────────────────────────────────────────────┘
```
- Sidebar nền `--sidebar`, viền phải; mục: icon Lucide 16px + nhãn 14/500; active = nền `--sidebar-accent` + vạch đỏ 2px bên trái. Mobile: Sheet.
- Topbar: breadcrumb (mục cha nhạt, trang hiện tại đậm), không lặp tiêu đề lớn.

## 5. Pattern trang

| Pattern | Áp dụng | Quy tắc |
|---|---|---|
| **Danh sách** | Người dùng, học phần, lớp, nhật ký, ngân hàng câu hỏi | Thanh công cụ (tìm kiếm trái, lọc + hành động phải) → bảng/hàng có viền ngăn 1px, hover nhạt, hành động phụ trong menu `…` → phân trang. Trạng thái bằng badge chữ, không tô cả hàng |
| **Workspace lớp** (kiểu Canvas/ClassroomIO) | Trang lớp GV và SV | Header lớp: mã lớp (mono) · tên · học kỳ · giảng viên · sĩ số; dưới là **tab ngang** (Tổng quan, Học liệu, Bài tập, Sinh viên, Kết quả) lưu trong URL `?tab=` |
| **Trang chủ theo vai** (kiểu Canvas "To do") | SV: lớp của tôi; GV: lớp phụ trách | Khối "Sắp đến hạn" (bài trong 7 ngày, sắp theo hạn, nhãn còn x giờ) + lưới thẻ lớp gọn (mã, tên, học kỳ, số bài đang mở) |
| **Trang soạn** | Soạn câu hỏi, soạn bài | Header dính (quay lại · tiêu đề · trạng thái lưu · nút CTA Lưu); form chia section có tiêu đề + mô tả bên trái (desktop 2 cột 1/3–2/3) hoặc xếp dọc; xem trước ở cột phải khi đủ rộng |
| **Workspace code** (kiểu Codeforces/HackerRank) | Làm bài lập trình | Tràn màn: trái đề (tab Đề / Bài nộp), phải editor; thanh hành động: ngôn ngữ · Chạy thử (outline) · Nộp bài (CTA); panel kết quả dưới editor |
| **Làm quiz** (kiểu Google Forms/Moodle) | Quiz | Header dính (tiêu đề · tiến độ x/n · Nộp bài CTA); cột trái lưới số câu (đã làm = nền đậm, đánh dấu = chấm cam, đang xem = viền); giữa một câu mỗi lần, rộng tối đa 720px |
| **Chi tiết bài nộp** (kiểu DMOJ) | Bài nộp code | Hàng tóm tắt (verdict lớn, điểm, thời gian, ngôn ngữ) → code chỉ đọc → bảng test → log |

## 6. Thành phần

- Nút: `default` (đen/trắng) cho hành động thường; **`cta`** (đỏ) cho hành động chính — tối đa 1 mỗi màn; `outline` cho phụ; `ghost` cho icon/menu; `destructive` chỉ trong xác nhận xóa.
- Badge: viền 1px + chữ màu trạng thái trên nền 10% cùng màu; vai trò: Admin đen đặc, Giảng viên viền, Sinh viên muted.
- Verdict: `VerdictBadge` (mã mono + nhãn). AC xanh, WA/RE/CE đỏ, TLE/MLE/OLE cam, SE xám.
- Form: nhãn trên ô, mô tả ngắn dưới nhãn khi cần, lỗi đỏ ngay dưới ô; nhóm lựa chọn ≤ 4 dùng radio/toggle, nhiều hơn dùng Select; bật/tắt dùng Switch.
- Bảng: header 12/500 muted, không nền đậm; cột số căn phải `tabular-nums`; mã/ID mono.
- Trạng thái trang: skeleton đúng hình nội dung → empty state (icon nét 20px muted, 1 câu giải thích, 1 hành động) → error (thông điệp + "Thử lại").
- Xác nhận phá hủy: `AlertDialog`, không `window.confirm`.

## 7. Chuyển động & truy cập

- Chỉ `transition-colors 150–200ms`; mở panel/dialog theo animation sẵn của Radix; tôn trọng `prefers-reduced-motion`.
- Focus ring 2px `--ring` thấy rõ ở cả hai theme; mọi input có label; icon-only có `aria-label`; tương phản chữ ≥ 4.5:1.
- Đổi theme: `.theme-transition` gắn tạm ~250ms.

## 8. Logo

Monogram "3 thanh cao dần" đơn sắc trong ô vuông bo góc màu `--foreground`, tự đảo theo theme; wordmark **LMS-P** Be Vietnam Pro 600, tracking chặt.
