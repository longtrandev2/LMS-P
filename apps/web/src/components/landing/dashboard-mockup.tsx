"use client";

import { CheckCircle2, Clock3, FileCode2 } from "lucide-react";

const SIDEBAR_ITEMS = [
  "Lớp học phần",
  "Học liệu",
  "Bài tập",
  "Ngân hàng đề",
  "Sổ điểm",
];

/** Visual hero: mockup bảng điều khiển dựng bằng div — không dùng ảnh */
export function DashboardMockup() {
  return (
    <div className="ring-1 ring-foreground/10 shadow-2xl shadow-primary/10">
      {/* Thanh cửa sổ */}
      <div className="flex items-center gap-2 border-b border-border bg-muted px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-gold/70" />
        <span className="ml-3 font-mono text-[11px] text-muted-foreground">
          lms-p · Bảng điều khiển sinh viên
        </span>
      </div>

      <div className="grid grid-cols-[120px_1fr] bg-card">
        {/* Sidebar mini — ink navy signature */}
        <div className="flex flex-col gap-1 bg-sidebar p-3">
          {SIDEBAR_ITEMS.map((item, i) => (
            <div
              key={item}
              className={
                i === 0
                  ? "rounded-none bg-sidebar-accent px-2 py-1.5 text-[11px] font-medium text-sidebar-primary"
                  : "px-2 py-1.5 text-[11px] text-sidebar-foreground/60"
              }
            >
              {item}
            </div>
          ))}
        </div>

        {/* Nội dung chính */}
        <div className="flex flex-col gap-4 p-5">
          <div>
            <p className="text-[11px] font-semibold tracking-widest uppercase text-gold">
              Học kỳ I · 2026–2027
            </p>
            <p className="font-heading text-base font-semibold text-card-foreground">
              Xin chào, Minh Anh
            </p>
          </div>

          {/* Thẻ lớp học phần */}
          <div className="grid gap-3">
            <ClassRow
              code="IT3090 · NH21"
              name="Lập trình mạng"
              progress={68}
            />
            <ClassRow
              code="IT3090 · NH22"
              name="Lập trình mạng — lớp thực hành"
              progress={41}
            />
          </div>

          {/* Kết quả chấm realtime */}
          <div className="flex items-start gap-3 border border-border bg-background p-3">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center bg-primary/10 text-primary">
              <FileCode2 className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-[11px] font-medium text-card-foreground">
                bai_nop_128 · tcp_echo_server.py
              </p>
              <p className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1 text-success">
                  <CheckCircle2 className="size-3" /> 10/10 test
                </span>
                <span className="flex items-center gap-1">
                  <Clock3 className="size-3" /> 1.2s · sandbox
                </span>
              </p>
            </div>
            <span className="shrink-0 border border-gold/40 bg-gold/10 px-2 py-1 font-heading text-sm font-bold text-gold">
              10
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClassRow({
  code,
  name,
  progress,
}: {
  code: string;
  name: string;
  progress: number;
}) {
  return (
    <div className="border border-border bg-background p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="truncate text-xs font-semibold text-card-foreground">
          {name}
        </p>
        <p className="shrink-0 font-mono text-[11px] text-muted-foreground">
          {code}
        </p>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div
          className="h-1 flex-1 bg-muted"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Tiến độ ${name}`}
        >
          <div
            className="h-full bg-gold"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {progress}%
        </span>
      </div>
    </div>
  );
}
