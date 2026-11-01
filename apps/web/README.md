# LMS Web — React SPA + Vite

Ứng dụng React + TypeScript, điều hướng bằng React Router. Các màn nghiệp vụ được nhóm trong `src/features/`; thành phần dùng chung ở `src/components/`.

## Chạy local

```powershell
npm install
$env:VITE_API_URL = "http://localhost:8000"
npm run dev
```

- Build: `npm run build`
- Lint: `npm run lint`
- API URL đọc từ `VITE_API_URL`, mặc định `http://localhost:8000`.
- WebSocket dùng riêng cho sự kiện chấm bài qua `VITE_WS_URL`.
