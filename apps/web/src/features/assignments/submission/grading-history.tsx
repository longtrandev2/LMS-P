import { shortDateTime } from "@/features/assignments/lecturer/labels";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { VerdictBadge } from "@/components/verdict-badge";
import type { GradingResultView } from "@/types/api";

/** Lịch sử chấm (mới nhất trước) — chọn một lần chấm để xem bảng test của lần đó. */
export function GradingHistory({ results, selected, onSelect }: {
  results: GradingResultView[]; selected: number | null; onSelect: (gradingAttempt: number) => void;
}) {
  return <ol className="space-y-0.5" aria-label="Lịch sử chấm">
    {results.map((result, index) => {
      const active = result.grading_attempt === selected;
      return <li key={result.grading_attempt}>
        <button type="button" aria-current={active ? "true" : undefined} onClick={() => onSelect(result.grading_attempt)}
          className={cn("flex min-h-10 w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-md px-2 py-2 text-left text-sm transition-colors duration-150 outline-none hover:bg-secondary/60 focus-visible:ring-2 focus-visible:ring-ring",
            active && "bg-secondary")}>
          <span className="font-medium">Lần chấm {result.grading_attempt}</span>
          {index === 0 ? <Badge>Hiện hành</Badge> : null}
          {result.verdict ? <VerdictBadge verdict={result.verdict} compact /> : <span className="text-xs text-muted-foreground">{result.status}</span>}
          {result.tests_total ? <span className="text-xs text-muted-foreground tabular-nums">{result.tests_passed ?? 0}/{result.tests_total} test</span> : null}
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {shortDateTime(result.graded_at)} · {(result.duration_ms / 1000).toFixed(1)} s
          </span>
        </button>
      </li>;
    })}
  </ol>;
}
