const SIDEBAR_ITEMS = [
  "Lớp học phần",
  "Học liệu",
  "Bài tập",
  "Kỳ thi",
  "Sổ điểm",
];

/**
 * Visual hero: mockup bảng điều khiển dựng bằng div — không dùng ảnh.
 * Mô phỏng đúng giao diện app: sidebar, tiêu đề trang, panel kết quả chấm
 * từng test. Không icon bubble, không màu trang trí.
 */
export function DashboardMockup() {
  return (
    <div className="border border-border bg-card shadow-sm">
      {/* Thanh cửa sổ */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <span className="size-2 rounded-full bg-border" />
        <span className="size-2 rounded-full bg-border" />
        <span className="size-2 rounded-full bg-border" />
        <span className="ml-3 font-mono text-[11px] text-muted-foreground">
          LMS-P · Bảng điều khiển sinh viên
        </span>
      </div>

      <div className="grid grid-cols-[110px_1fr]">
        {/* Sidebar mini */}
        <nav className="flex flex-col gap-0.5 border-r border-border p-2">
          {SIDEBAR_ITEMS.map((item, i) => (
            <div
              key={item}
              className={
                i === 0
                  ? "bg-muted px-2 py-1.5 text-[11px] font-medium text-foreground"
                  : "px-2 py-1.5 text-[11px] text-muted-foreground"
              }
            >
              {item}
            </div>
          ))}
        </nav>

        {/* Nội dung chính */}
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-card-foreground">
              Cấu trúc dữ liệu và giải thuật
            </p>
            <p className="font-mono text-[11px] text-muted-foreground">
              IT3090-11 · Học kỳ I
            </p>
          </div>

          {/* Panel kết quả chấm — đúng dữ liệu thật hệ thống trả về */}
          <div className="border border-border">
            <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
              <p className="truncate text-[11px] font-medium text-card-foreground">
                Bài tập 02 · Máy chủ echo TCP
              </p>
              <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                9/10
              </span>
            </div>
            <div className="border-b border-border px-3 py-1.5">
              <p className="font-mono text-[10px] text-muted-foreground">
                tcp_echo_server.py · Python
              </p>
            </div>
            <ul>
              {TESTS.map((test) => (
                <li
                  key={test.id}
                  className="flex items-center gap-2 border-b border-border px-3 py-1.5 font-mono text-[10px] last:border-b-0"
                >
                  <span
                    className={`size-1.5 shrink-0 rounded-full ${
                      test.pass ? "bg-success" : "bg-destructive"
                    }`}
                  />
                  <span className="text-card-foreground">{test.id}</span>
                  <span className={test.pass ? "text-success" : "text-destructive"}>
                    {test.verdict}
                  </span>
                  <span className="ml-auto text-muted-foreground">
                    {test.detail}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Bài tập tới hạn */}
          <div className="flex items-center justify-between gap-2 border border-border px-3 py-2">
            <p className="truncate text-[11px] text-card-foreground">
              Bài tập 03 · Trò chơi đoán số
            </p>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              Hạn 19/11 · 23:59
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

const TESTS = [
  { id: "test_01", verdict: "pass", detail: "12ms", pass: true },
  { id: "test_02", verdict: "pass", detail: "9ms", pass: true },
  { id: "test_03", verdict: "fail", detail: "sai kết quả", pass: false },
];
