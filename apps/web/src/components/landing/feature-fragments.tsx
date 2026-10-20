/**
 * Fragment UI minh họa năng lực hệ thống — dựng bằng div thuần, mô phỏng
 * đúng giao diện thật của app (bảng, danh sách, panel kết quả chấm).
 * Không icon, không màu nền card — chỉ viền 1px + token chữ.
 */

function FragmentShell({
  label,
  meta,
  children,
}: {
  label: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <p className="truncate text-xs font-medium text-card-foreground">
          {label}
        </p>
        {meta ? (
          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
            {meta}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

/** Fragment 01 — bảng lớp học phần thu nhỏ như trong app */
export function SectionListFragment() {
  const rows = [
    { code: "IT3090-11", name: "Cấu trúc dữ liệu và giải thuật", students: 42, open: true },
    {
      code: "IT3090-12",
      name: "Cấu trúc dữ liệu và giải thuật — thực hành",
      students: 38,
      open: true,
    },
    {
      code: "IT4082-11",
      name: "Cơ sở dữ liệu",
      students: 30,
      open: false,
    },
  ];

  return (
    <FragmentShell label="Lớp học phần" meta="Học kỳ I · 2026–2027">
      <ul>
        {rows.map((row) => (
          <li
            key={row.code}
            className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 last:border-b-0"
          >
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-card-foreground">
                {row.name}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                {row.code} · {row.students} sinh viên
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
              <span
                className={`size-1.5 rounded-full ${
                  row.open ? "bg-success" : "bg-muted-foreground/40"
                }`}
              />
              {row.open ? "Đang mở" : "Sắp mở"}
            </span>
          </li>
        ))}
      </ul>
    </FragmentShell>
  );
}

/** Fragment 02 — danh sách bài tập với hạn nộp và trạng thái */
export function AssignmentListFragment() {
  const rows = [
    {
      title: "Bài tập 02 · Máy chủ echo TCP",
      due: "Hạn nộp 12/11 · 23:59",
      state: "Đã nộp",
      done: true,
    },
    {
      title: "Bài tập 03 · Trò chơi đoán số",
      due: "Hạn nộp 19/11 · 23:59",
      state: "Chưa nộp",
      done: false,
    },
    {
      title: "Kiểm tra giữa kỳ · 20 câu trắc nghiệm",
      due: "Mở thi 22/11 · 45 phút",
      state: "Chưa thi",
      done: false,
    },
  ];

  return (
    <FragmentShell label="Bài tập · Chương 3 — Giao thức TCP">
      <ul>
        {rows.map((row) => (
          <li
            key={row.title}
            className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 last:border-b-0"
          >
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-card-foreground">
                {row.title}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {row.due}
              </p>
            </div>
            <span
              className={`shrink-0 text-[11px] ${
                row.done ? "text-success" : "text-muted-foreground"
              }`}
            >
              {row.state}
            </span>
          </li>
        ))}
      </ul>
    </FragmentShell>
  );
}

interface TestRow {
  id: string;
  verdict: string;
  detail: string;
  pass: boolean;
}

/** Fragment 03 — panel kết quả chấm từng test như sinh viên thấy */
export function JudgeResultFragment() {
  const tests: TestRow[] = [
    { id: "test_01", verdict: "pass", detail: "12ms", pass: true },
    { id: "test_02", verdict: "pass", detail: "9ms", pass: true },
    { id: "test_03", verdict: "fail", detail: "sai kết quả", pass: false },
  ];

  return (
    <FragmentShell label="Bài tập 02 · Máy chủ echo TCP" meta="9/10 điểm">
      <div className="border-b border-border px-4 py-2">
        <p className="font-mono text-[11px] text-muted-foreground">
          tcp_echo_server.py · Python
        </p>
      </div>
      <ul>
        {tests.map((test) => (
          <li
            key={test.id}
            className="flex items-center gap-2.5 border-b border-border px-4 py-2 font-mono text-[11px] last:border-b-0"
          >
            <span
              className={`size-1.5 shrink-0 rounded-full ${
                test.pass ? "bg-success" : "bg-destructive"
              }`}
            />
            <span className="text-card-foreground">{test.id}</span>
            <span
              className={test.pass ? "text-success" : "text-destructive"}
            >
              {test.verdict}
            </span>
            <span className="ml-auto text-muted-foreground">{test.detail}</span>
          </li>
        ))}
      </ul>
    </FragmentShell>
  );
}
