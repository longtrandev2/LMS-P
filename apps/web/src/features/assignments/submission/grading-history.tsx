import { formatUtcDateTime } from "@/lib/date-time";
import { cn } from "@/lib/utils";
import { VerdictBadge } from "@/components/verdict-badge";
import type { GradingResultView } from "@/types/api";

/** Lịch sử chấm (mới nhất trước) — chọn một lần chấm để xem bảng test của lần đó. */
export function GradingHistory({ results, selected, onSelect }: {
  results: GradingResultView[]; selected: number | null; onSelect: (gradingAttempt: number) => void;
}) {
  return <ol className="divide-y" aria-label="Lịch sử chấm">
    {results.map((result, index) => {
      const active = result.grading_attempt === selected;
      return <li key={result.grading_attempt}>
        <button type="button" aria-current={active ? "true" : undefined} onClick={() => onSelect(result.grading_attempt)}
          className={cn("flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-left text-sm transition-colors outline-none hover:bg-muted/50 focus-visible:bg-muted/60",
            active && "bg-primary/5")}>
          <span className="font-medium">Lần chấm {result.grading_attempt}</span>
          {index === 0 ? <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">Hiện hành</span> : null}
          {result.verdict ? <VerdictBadge verdict={result.verdict} compact /> : <span className="text-xs text-muted-foreground">{result.status}</span>}
          {result.tests_total ? <span className="text-xs text-muted-foreground tabular-nums">{result.tests_passed ?? 0}/{result.tests_total} test</span> : null}
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {formatUtcDateTime(result.graded_at)} · {(result.duration_ms / 1000).toFixed(1)} s
          </span>
        </button>
      </li>;
    })}
  </ol>;
}
