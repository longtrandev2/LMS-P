# LMS Web — Next.js App Router

Frontend LMS môn Lập trình mạng. Chi tiết hướng design và token: [DESIGN.md](./DESIGN.md).

## Stack
- Next.js (App Router, TypeScript, src dir) + Tailwind CSS v4
- shadcn/ui (radix), Lucide icons
- TanStack Query (data fetching), zustand persist (session), next-themes (dark mode)

## Chạy dev
```bash
npm install
cp .env.example .env.local   # chỉnh NEXT_PUBLIC_API_URL nếu API chạy cổng khác
npm run dev                  # http://localhost:3000
```

## Cấu trúc chính
```
src/
├── app/
│   ├── (auth)/login/            # Đăng nhập
│   ├── (app)/                   # Nhóm route có guard + app shell
│   │   ├── admin/users/         # Admin — CRUD users, import CSV, reset mật khẩu
│   │   ├── courses/[id]/        # Lecturer — lớp thuộc khóa học
│   │   ├── classes/[id]/        # Lecturer — chi tiết lớp + tab sinh viên
│   │   └── me/classes/          # Student — lớp đã ghi danh
│   └── page.tsx                 # Redirect theo vai trò
├── components/                  # app-shell, state blocks, feature components
├── hooks/use-auth-guard.ts      # Protected routes + role guard
├── lib/                         # api wrapper, query keys, error messages
├── stores/auth.ts               # zustand persist (user, tokens)
└── types/api.ts                 # Hợp đồng kiểu với api-spec.md
```

## Ghi chú hợp đồng API
- Auth: Bearer token; 401 → tự rotate refresh 1 lần → retry; thất bại → về /login.
- Lỗi theo envelope `{error:{code,message}}` — map thông điệp tiếng Việt ở `lib/error-messages.ts`.
- Assumptions chi tiết (reset mật khẩu, import CSV, enroll bulk) ghi trong report của wave.
