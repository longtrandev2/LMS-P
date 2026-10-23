# DESIGN.md — LMS Web (identity & class management)

Hướng design: **monochrome product** — trắng/đen chuẩn product (kiểu Linear/Vercel/Notion):
dense, clean, không trang trí. Chỉ đúng 3 màu chức năng:

- **Đen/trắng** (neutral): toàn bộ nội dung, bề mặt, viền, chữ.
- **Đỏ CTA** (`--cta`, red-600): chỉ cho hành động chính — nút submit/CTA, active nav marker.
- **Xanh lá / đỏ** (`--success` / `--destructive`): chỉ cho trạng thái pass/fail.

Cấm: gradient tím generic, serif display, nền kem/vàng đồng, eyebrow uppercase nhiều,
icon bubble màu, fake stats, tech names trên UI marketing, emoji làm icon.
## 1. Design tokens

Đặt trong `src/app/globals.css` (Tailwind v4 `@theme inline`, chuẩn shadcn/ui variables, oklch).

### Palette — Light (trắng nền, đen nội dung, đỏ CTA)
| Token | Giá trị | Dùng |
|---|---|---|
| `--background` | `oklch(1 0 0)` — trắng | nền trang |
| `--foreground` | `oklch(0.145 0 0)` — đen | chữ chính, badge logo |
| `--primary` | `oklch(0.145 0 0)` — đen | nút chính (đen), link |
| `--primary-foreground` | `oklch(0.985 0 0)` | chữ trên primary |
| `--cta` | `oklch(0.577 0.245 27.3)` — red-600 | **nút CTA**, active nav marker |
| `--cta-foreground` | `oklch(1 0 0)` | chữ trên CTA |
| `--accent` | `oklch(0.967 0 0)` — neutral-100 | hover |
| `--card` | `oklch(1 0 0)` | bề mặt card |
| `--muted` | `oklch(0.967 0 0)` | nền phụ, chip |
| `--muted-foreground` | `oklch(0.552 0 0)` — neutral-500 | chữ phụ (contrast đạt chuẩn) |
| `--border`, `--input` | `oklch(0.922 0 0)` — neutral-200 | viền |
| `--ring` | `oklch(0.145 0 0)` | focus ring |
| `--destructive` | `oklch(0.577 0.245 27.3)` | lỗi, xóa |
| `--gold` | `oklch(0.577 0.245 27.3)` | **token cũ giữ tên** — giờ là đỏ CTA |
| `--success` | `oklch(0.527 0.154 150)` | pass/thành công |

Chart: `--chart-1..5` = bậc xám + đỏ CTA + xanh lá.

### Palette — Dark (đen xám đậm, đỏ CTA sáng để giữ contrast)
| Token | Giá trị |
|---|---|
| `--background` | `oklch(0.13 0 0)` |
| `--foreground` | `oklch(0.97 0 0)` |
| `--primary` | `oklch(0.97 0 0)` — trắng (nút chính đảo màu) |
| `--primary-foreground` | `oklch(0.145 0 0)` |
| `--cta` | `oklch(0.637 0.237 25)` — red-500 |
| `--card` / `--popover` | `oklch(0.17 0 0)` — nổi khối nhẹ so với nền |
| `--muted` | `oklch(0.21 0 0)` |
| `--muted-foreground` | `oklch(0.708 0 0)` |
| `--border` | `oklch(0.26 0 0)` |
| `--destructive` | `oklch(0.704 0.191 22.2)` |
| `--gold` | `oklch(0.637 0.237 25)` |
| `--success` | `oklch(0.723 0.219 149.6)` |

### Elevation
- `--shadow-soft`: bóng ambient nhẹ (header sticky, hover card).
- `--shadow-glass`: bóng sâu hơn (dialog, card login).
- Dark mode phân cấp chủ yếu bằng độ chênh nền + border; shadow chỉ bổ trợ.

Sidebar: nền gần trắng + viền phải ở light mode (`--sidebar: oklch(0.985 0 0)`),
đen xám đậm ở dark mode (`oklch(0.16 0 0)`) — không còn "ink navy signature".
Active item: nền `--sidebar-accent` + **thanh đỏ CTA bên trái**.

### Theme transition
Đổi theme qua `theme-toggle.tsx` gắn tạm class `.theme-transition` vào `<html>` ~250ms
(transition background/border/color 200ms) — không giữ transition thường trực
trên `*` để tránh lag hover. Tôn trọng `prefers-reduced-motion`.

### Logo (`src/components/logo.tsx`)
- **Badge monogram "bộ tầng tri thức"**: rounded square màu `--foreground` chứa
  3 thanh màu `--background` cao dần — gợi sách/bậc thang tri thức. Đơn sắc,
  tự đảo theo dark mode, rõ ở 16px.
- Wordmark **LMS-P** bằng sans (Be Vietnam Pro) weight 600, tracking chặt — không serif.
- API: `<Logo size variant="full" | "mark" caption />`. File tĩnh: `public/logo.svg`,
  favicon `src/app/icon.svg` (đen `#111111` + trắng `#FFFFFF` cố định).
- Một màu, không motif mạch điện/node mạng/terminal, không vàng đồng.

### Typography
- Mọi chữ (heading + UI/body): **Be Vietnam Pro** (sans, tối ưu dấu tiếng Việt) —
  `--font-heading` gán bằng `--font-sans`, heading dùng weight 600, tracking chặt
  (`--tracking-heading: -0.02em`). Không serif display.
- Mono cho dữ liệu định danh: `font-mono` (Geist Mono).
- Scale (rem): `h1` 1.875/600 · `h2` 1.375/600 · `h3` 1.125/600 ·
  body 0.875/400 · caption 0.75/500. Không lạm dụng uppercase/tracking-widest.

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
| `app-shell.tsx` | Khung: sidebar theo role + header (user menu, theme toggle dropdown) |
| `nav-sidebar.tsx` | Nav item (Lucide icon), active marker đỏ CTA, nhóm theo role |
| `logo.tsx` | Badge monogram LMS-P đơn sắc + wordmark sans (variant full/mark) |
| `ui/theme-toggle.tsx` | Dropdown Sáng/Tối/Hệ thống (theme provider React, icon sun/moon) |
| `page-header.tsx` | Tiêu đề trang sans weight 600 + mô tả + actions |
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
│ (neutral)│                                      │
│  Logo    │  Page header (serif) + actions       │
│  ── Admin│  Content: table / grid / dialogs     │
│  ── Lec  │                                      │
│  ── Stu  │                                      │
│  user ↓  │                                      │
└──────────┴──────────────────────────────────────┘
```

- `/login`: form card trắng viền; panel giới thiệu đơn sắc đảo theo theme
  (`bg-foreground text-background`), không họa tiết trang trí; nút submit đỏ CTA.
- Protected: `(app)` layout kiểm tra session; role guard chặn route không đúng role.

## 4. Ngữ nghĩa trạng thái

- Badge role: Admin = đen solid, Lecturer = outline đen, Student = muted.
- Badge status: active = xanh lá (`--success`), locked = đỏ (`--destructive`).
- Nút hành động chính: variant `cta` (đỏ). Nút thường: đen (light) / trắng (dark).
- Mọi trang: skeleton (loading) → empty-state (icon + hướng dẫn + CTA) → error-state
  (thông điệp tiếng Việt + nút "Thử lại").
