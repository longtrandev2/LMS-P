import { Fragment, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VerdictBadge } from "@/components/verdict-badge";
import { cn } from "@/lib/utils";
import { MonoBlock } from "./mono-block";
import type { GradingResultView, TestResultView } from "@/types/api";

const hasData = (test: TestResultView) => test.input != null || test.expected_output != null || test.output != null;

/** Bảng test đã chạy; hàng có input/expected/output mở rộng thành 3 khối mono cạnh nhau. */
export function TestResultsTable({ result }: { result: GradingResultView }) {
  const tests = [...(result.tests ?? [])].sort((a, b) => a.position - b.position);
  const [open, setOpen] = useState<Set<number>>(() => new Set(result.failed_test != null ? [result.failed_test] : []));
  const toggle = (position: number) => setOpen((current) => {
    const next = new Set(current);
    if (next.has(position)) next.delete(position); else next.add(position);
    return next;
  });
  const skipped = result.tests_total != null ? result.tests_total - tests.length : 0;

  if (tests.length === 0) return <p className="px-5 py-6 text-sm text-muted-foreground">
    {result.compile_error ? "Không chạy test nào vì biên dịch lỗi." : "Chưa có kết quả test."}
  </p>;
  return <div>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Loại</TableHead>
          <TableHead>Kết quả</TableHead>
          <TableHead className="text-right">Thời gian</TableHead>
          <TableHead className="text-right">Bộ nhớ</TableHead>
          <TableHead className="w-12"><span className="sr-only">Chi tiết</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tests.map((test) => {
          const expandable = hasData(test);
          const expanded = expandable && open.has(test.position);
          const panelId = `test-${result.grading_attempt}-${test.position}`;
          return <Fragment key={test.position}>
            <TableRow className={cn(expandable && "cursor-pointer")} onClick={expandable ? () => toggle(test.position) : undefined}>
              <TableCell className="font-mono text-xs tabular-nums">{test.position}</TableCell>
              <TableCell>{test.is_public ? <Badge variant="outline">Mẫu</Badge> : <Badge variant="secondary">Ẩn</Badge>}</TableCell>
              <TableCell><VerdictBadge verdict={test.verdict} /></TableCell>
              <TableCell className="text-right font-mono text-xs tabular-nums">{test.time_ms != null ? `${test.time_ms} ms` : "—"}</TableCell>
              <TableCell className="text-right font-mono text-xs tabular-nums">{test.memory_kb != null ? `${Math.round(test.memory_kb / 1024 * 10) / 10} MB` : "—"}</TableCell>
              <TableCell>
                {expandable ? <Button type="button" variant="ghost" size="icon-xs" aria-expanded={expanded} aria-controls={panelId}
                  aria-label={expanded ? `Ẩn chi tiết test ${test.position}` : `Xem chi tiết test ${test.position}`}
                  onClick={(event) => { event.stopPropagation(); toggle(test.position); }}>
                  <ChevronRight className={cn("transition-transform duration-150 motion-reduce:transition-none", expanded && "rotate-90")} aria-hidden />
                </Button> : null}
              </TableCell>
            </TableRow>
            {expanded ? <TableRow id={panelId} className="hover:bg-transparent">
              <TableCell colSpan={6} className="bg-muted/40 p-3 whitespace-normal">
                <div className="grid gap-3 lg:grid-cols-3">
                  <MonoBlock title="Input" value={test.input} />
                  <MonoBlock title="Output mong đợi" value={test.expected_output} />
                  <MonoBlock title="Output của bài" value={test.output} tone={test.verdict === "AC" ? "default" : "danger"} />
                </div>
              </TableCell>
            </TableRow> : null}
          </Fragment>;
        })}
      </TableBody>
    </Table>
    {skipped > 0 ? <p className="border-t px-5 py-3 text-xs text-muted-foreground">
      {skipped} test còn lại không chạy — bài nộp dừng ở test sai đầu tiên.
    </p> : null}
  </div>;
}
