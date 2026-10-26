import { Clock, Download, FileText, Presentation, Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VerdictBadge } from "@/components/verdict-badge";
import { cn } from "@/lib/utils";
import type { GradingVerdict } from "@/types/api";

/**
 * Mảnh giao diện thật (dựng bằng component của app) để minh họa ở landing/đăng nhập.
 * Nội dung là ví dụ mô tả chức năng — không số liệu thống kê. Luôn dùng token theme
 * của trang (bg-card, text-foreground) để đúng màu ở cả hai chế độ.
 */
function Frame({ title, aside, children, className }: {
  title: string; aside?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <div aria-hidden className={cn("pointer-events-none overflow-hidden rounded-xl border bg-card text-card-foreground select-none", className)}>
      <div className="flex h-10 items-center justify-between gap-3 border-b px-4">
        <p className="truncate text-xs font-semibold">{title}</p>
        {aside}
      </div>
      {children}
    </div>
  );
}

const DEADLINES = [
  { title: "Socket TCP: máy chủ echo", code: "LTM.01", kind: "Bài tập", due: "còn 5 giờ", urgent: true },
  { title: "Quiz chương 3 — Giao thức UDP", code: "LTM.01", kind: "Quiz", due: "còn 2 ngày", urgent: false },
  { title: "Xử lý đa luồng phía máy chủ", code: "LTM.02", kind: "Bài tập", due: "còn 6 ngày", urgent: false },
];

export function DeadlinesFragment({ className }: { className?: string }) {
  return (
    <Frame title="Sắp đến hạn" className={className}>
      <ul className="divide-y">
        {DEADLINES.map((row) => (
          <li key={row.title} className="flex items-center gap-3 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{row.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground"><span className="font-mono">{row.code}</span> · {row.kind}</p>
            </div>
            <span className={cn("inline-flex shrink-0 items-center gap-1 text-xs font-medium", row.urgent ? "text-warning" : "text-muted-foreground")}>
              <Clock className="size-3.5" /> {row.due}
            </span>
          </li>
        ))}
      </ul>
    </Frame>
  );
}

const TESTS: { name: string; verdict: GradingVerdict }[] = [
  { name: "Test 1", verdict: "AC" },
  { name: "Test 2", verdict: "AC" },
  { name: "Test 3", verdict: "WA" },
  { name: "Test 4", verdict: "TLE" },
];

export function SubmissionFragment({ className }: { className?: string }) {
  return (
    <Frame title="Bài nộp · Máy chủ echo" aside={<span className="font-mono text-xs text-muted-foreground">Python</span>} className={className}>
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <VerdictBadge verdict="WA" />
        <span className="text-xs text-muted-foreground">Chấm xong, cập nhật tức thì</span>
      </div>
      <ul className="divide-y">
        {TESTS.map((test) => (
          <li key={test.name} className="flex items-center justify-between gap-3 px-4 py-2">
            <span className="text-sm">{test.name}</span>
            <VerdictBadge verdict={test.verdict} compact />
          </li>
        ))}
      </ul>
    </Frame>
  );
}

const MATERIALS = [
  { title: "Chương 3 — Lập trình socket", type: "PDF", icon: FileText },
  { title: "Slide buổi 5: TCP và UDP", type: "Slide", icon: Presentation },
  { title: "Tài liệu tham khảo RFC 793", type: "Liên kết", icon: Link2 },
];

export function ClassFragment({ className }: { className?: string }) {
  return (
    <Frame title="Lớp học" aside={<span className="font-mono text-xs text-muted-foreground">LTM.01</span>} className={className}>
      <div className="flex gap-4 border-b px-4 text-sm">
        {["Tổng quan", "Học liệu", "Bài tập"].map((tab, i) => (
          <span key={tab} className={cn("relative py-2.5 font-medium", i === 1 ? "text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-foreground" : "text-muted-foreground")}>{tab}</span>
        ))}
      </div>
      <ul className="divide-y">
        {MATERIALS.map((m) => (
          <li key={m.title} className="flex items-center gap-3 px-4 py-2.5">
            <m.icon className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{m.title}</p>
              <p className="text-xs text-muted-foreground">{m.type}</p>
            </div>
            <Button variant="outline" size="icon-sm" tabIndex={-1}><Download /></Button>
          </li>
        ))}
      </ul>
    </Frame>
  );
}

export function QuizFragment({ className }: { className?: string }) {
  const answered = [1, 2, 3, 5, 6];
  return (
    <Frame title="Quiz chương 3" aside={<Badge variant="outline">Đang làm</Badge>} className={className}>
      <div className="grid gap-4 p-4 sm:grid-cols-[auto_1fr]">
        <div className="grid w-fit grid-cols-5 gap-1.5">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <span key={n} className={cn("relative grid size-7 place-items-center rounded-md border font-mono text-xs",
              answered.includes(n) ? "border-foreground bg-foreground text-background" : "bg-card text-muted-foreground",
              n === 4 && "ring-2 ring-foreground ring-offset-1 ring-offset-card")}>
              {n}
              {n === 7 ? <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-warning" /> : null}
            </span>
          ))}
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-medium">Câu 4. Giao thức nào đảm bảo thứ tự gói tin?</p>
          {["TCP", "UDP", "ICMP"].map((option, i) => (
            <div key={option} className={cn("flex items-center gap-2 rounded-md border px-3 py-1.5", i === 0 && "border-foreground")}>
              <span className={cn("size-3.5 rounded-full border", i === 0 && "border-4 border-foreground")} />{option}
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}
