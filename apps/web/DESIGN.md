# DESIGN.md — LMS Web (identity & class management)

Hướng design: **"Học thuật hiện đại" (academic editorial)** — cảm giác thư viện/trường khoa học,
không phải SaaS dashboard template. Ink-and-paper: sidebar mực đậm (ink navy), nền giấy kem,
điểm nhấn vàng đồng. Typography serif display (Literata) kết hợp sans UI (Be Vietnam Pro) —
hỗ trợ đầy đủ dấu tiếng Việt.

Tuyệt đối tránh: gradient tím generic, Inter/Roboto, emoji làm icon, card đều nhau kiểu admin template.

## 1. Design tokens

Đặt trong `src/app/globals.css` (Tailwind v4 `@theme inline`, chuẩn shadcn/ui variables, oklch).

### Palette — Light (paper)
| Token | Giá trị | Dùng |
|---|---|---|
| `--background` | `oklch(0.977 0.006 85)` — giấy kem | nền trang |
| `--foreground` | `oklch(0.24 0.03 260)` — mực đậm | chữ chính |
| `--primary` | `oklch(0.34 0.07 258)` — ink navy | sidebar, nút chính, link |
| `--primary-foreground` | `oklch(0.97 0.01 85)` | chữ trên primary |
| `--accent` | `oklch(0.42 0.06 258)` — navy nhạt hơn | hover sidebar |
| `--card` | `oklch(1 0 0)` | bề mặt card |
| `--muted` | `oklch(0.945 0.008 85)` | nền phụ, chip |
| `--muted-foreground` | `oklch(0.47 0.02 260)` | chữ phụ (đạt contrast 4.5:1) |
| `--border` | `oklch(0.90 0.01 85)` | viền |
| `--ring` | ink navy | focus ring |
| `--destructive` | `oklch(0.55 0.2 27)` | lỗi, xóa |
| `--gold` | `oklch(0.72 0.12 80)` — vàng đồng | điểm nhấn nhỏ: badge mã lớp, active nav marker |

### Palette — Dark (đèn bàn học đêm)
| Token | Giá trị |
|---|---|
| `--background` | `oklch(0.17 0.015 260)` |
| `--foreground` | `oklch(0.93 0.008 85)` |
| `--primary` | `oklch(0.62 0.09 255)` — navy sáng lên cho contrast |
| `--card` | `oklch(0.21 0.018 260)` |
| `--muted` | `oklch(0.25 0.02 260)` |
| `--muted-foreground` | `oklch(0.70 0.015 260)` |
| `--border` | `oklch(0.30 0.02 260)` |
| `--gold` | `oklch(0.78 0.12 85)` |

Sidebar giữ **ink navy đậm ở cả 2 mode** (signature của app) — chữ kem, active item có thanh
gold bên trái + nền accent.

### Typography
- Display/headings: **Literata** (serif, học thuật) — tải qua `next/font`, subset `vietnamese`.
- UI/body: **Be Vietnam Pro** (sans, tối ưu dấu tiếng Việt).
- Scale (rem): `h1` 1.875/700 serif · `h2` 1.375/700 serif · `h3` 1.125/600 sans ·
  body 0.875/400 · caption 0.75/500 uppercase tracking-wide cho nhãn phân mục.
- Mã (mã lớp, mã SV): `font-mono` (Geist Mono của scaffold) — phân biệt dữ liệu định danh.

### Spacing & layout
- 8px base; page padding 24px (mobile 16px); card padding 20–24px; gap grid 16–24px.
- Shell: sidebar cố định 256px (desktop), nội dung `max-w-6xl`; mobile: sheet overlay.
- Radius: 10px card, 8px control — mềm nhưng không "pill" kiểu consumer app.
- Shadow: rất nhẹ (`--shadow-sm`), phân cấp bằng border + tone nền, không shadow bloat.

### Motion
- Chỉ `transition-colors duration-200` cho hover/focus; skeleton shimmer khi loading.
- Không scale-transform gây layout shift. Tôn trọng `prefers-reduced-motion`.

## 2. Component inventory

**Primitives (shadcn/ui):** button, input, label, card, table, dialog, dropdown-menu, select,
badge, sonner (toast), form, skeleton, tabs, separator, avatar, sheet, tooltip, alert.

**App components** (`src/components/`):
| Component | Vai trò |
|---|---|
| `app-shell.tsx` | Khung: sidebar theo role + header (user menu, dark mode toggle) |
| `nav-sidebar.tsx` | Nav item (Lucide icon), active marker gold, nhóm theo role |
| `page-header.tsx` | Tiêu đề trang serif + mô tả + actions |
| `state-blocks/*` | `loading-skeleton.tsx`, `empty-state.tsx`, `error-state.tsx` (retry) |
| `data-table-pagination.tsx` | Phân trang chuẩn `?page&limit` |
| `users/*` | Bảng users, dialog tạo/sửa, dialog reset mật khẩu, dialog import CSV |
| `courses/*` | Danh sách khóa học, dialog CRUD khóa học |
| `classes/*` | Danh sách lớp theo khóa, dialog CRUD lớp, tab sinh viên (thêm lẻ/bulk, xóa) |
| `me/class-card.tsx` | Thẻ lớp của sinh viên (mã mono, học kỳ, giảng viên) |

## 3. Layout khung

```
┌──────────┬──────────────────────────────────────┐
│ Sidebar  │ Header: breadcrumb-light · theme ⏻   │
│ (ink)    │                                      │
│  Logo    │  Page header (serif) + actions       │
│  ── Admin│  Content: table / grid / dialogs     │
│  ── Lec  │                                      │
│  ── Stu  │                                      │
│  user ↓  │                                      │
└──────────┴──────────────────────────────────────┘
```

- `/login`: nền paper, khối form đặt lệch trái kèm panel giới thiệu (ink) — không phải
  card nằm giữa màn hình kiểu template.
- Protected: `(app)` layout kiểm tra session; role guard chặn route không đúng role.

## 4. Ngữ nghĩa trạng thái

- Badge role: Admin = navy solid, Lecturer = outline navy, Student = muted.
- Badge status: active = xanh olive, locked = đỏ đất.
- Mọi trang: skeleton (loading) → empty-state (icon + hướng dẫn + CTA) → error-state
  (thông điệp tiếng Việt + nút "Thử lại").
