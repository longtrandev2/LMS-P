import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { VerdictBadge } from "@/components/verdict-badge";
import { cn } from "@/lib/utils";
import { MonoBlock } from "./mono-block";
import type { GradingResultView, TestResultView } from "@/types/api";

const hasData = (test: TestResultView) => test.input != null || test.expected_output != null || test.output != null;
const ROW = "grid h-11 w-full grid-cols-[2rem_3.5rem_minmax(0,1fr)_4.5rem_4.5rem_1.25rem] items-center gap-3 px-2 text-left text-sm";

function Cells({ test, expanded }: { test: TestResultView; expanded?: boolean }) {
  return <>
    <span className="font-mono text-xs text-muted-foreground tabular-nums">#{test.position}</span>
    {test.is_public ? <Badge variant="info">Mẫu</Badge> : <Badge>Ẩn</Badge>}
    <span className="min-w-0"><VerdictBadge verdict={test.verdict} /></span>
    <span className="text-right font-mono text-xs text-muted-foreground tabular-nums">{test.time_ms != null ? `${test.time_ms} ms` : "—"}</span>
    <span className="text-right font-mono text-xs text-muted-foreground tabular-nums">{test.memory_kb != null ? `${Math.round(test.memory_kb / 1024 * 10) / 10} MB` : "—"}</span>
    {expanded == null ? <span /> : <ChevronRight aria-hidden className={cn("size-4 text-muted-foreground transition-transform duration-150 motion-reduce:transition-none", expanded && "rotate-90")} />}
  </>;
}

/** Danh sách test dạng hàng (DESIGN.md §4 "Chi tiết bài nộp"); hàng có dữ liệu mở ra 3 khối Input/Expected/Output. */
export function TestResultsList({ result }: { result: GradingResultView }) {
  const tests = [...(result.tests ?? [])].sort((a, b) => a.position - b.position);
  const [open, setOpen] = useState<Set<number>>(() => new Set(result.failed_test != null ? [result.failed_test] : []));
  const toggle = (position: number) => setOpen((current) => {
    const next = new Set(current);
    if (next.has(position)) next.delete(position); else next.add(position);
    return next;
  });
  const skipped = result.tests_total != null ? result.tests_total - tests.length : 0;

  if (tests.length === 0) return <p className="py-4 text-sm text-muted-foreground">
    {result.compile_error ? "Không chạy test nào vì biên dịch lỗi." : "Chưa có kết quả test."}
  </p>;
  return <div>
    <ul className="border-t" aria-label="Kết quả từng test">
      {tests.map((test) => {
        const expandable = hasData(test);
        const expanded = expandable && open.has(test.position);
        const panelId = `test-${result.grading_attempt}-${test.position}`;
        return <li key={test.position} className="border-b">
          {expandable ? <button type="button" aria-expanded={expanded} aria-controls={panelId} onClick={() => toggle(test.position)}
            className={cn(ROW, "transition-colors duration-150 outline-none hover:bg-secondary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset")}>
            <Cells test={test} expanded={expanded} /><span className="sr-only">{expanded ? "Ẩn" : "Xem"} chi tiết</span>
          </button> : <div className={ROW}><Cells test={test} /></div>}
          {expanded ? <div id={panelId} className="grid gap-3 px-2 pt-1 pb-4 lg:grid-cols-3">
            <MonoBlock title="Input" value={test.input} />
            <MonoBlock title="Output mong đợi" value={test.expected_output} />
            <MonoBlock title="Output của bài" value={test.output} tone={test.verdict === "AC" ? "default" : "danger"} />
          </div> : null}
        </li>;
      })}
    </ul>
    {skipped > 0 ? <p className="px-2 pt-3 text-xs text-muted-foreground">
      {skipped} test còn lại không chạy — bài nộp dừng ở test sai đầu tiên.
    </p> : null}
  </div>;
}
