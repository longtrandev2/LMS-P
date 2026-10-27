import { Link } from "react-router-dom";
import { ChevronRight, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/state-blocks";
import type { AssignmentSummary, QuizAttempt } from "@/types/api";
import { formatScore } from "../../submission-result";
import { shortDateTime } from "../labels";
import { studentPaths } from "../paths";

function percent(score: number, max: number): string {
  return max > 0 ? `${Math.round((score / max) * 100)}%` : "—";
}

const ROW = "flex min-h-14 flex-wrap items-center gap-x-5 gap-y-1 border-b px-2 py-3 text-sm";

function AttemptRow({ attempt, item }: { attempt: QuizAttempt; item: AssignmentSummary }) {
  const max = attempt.max_score ?? item.total_points;
  const content = <>
    <span className="w-16 font-medium">Lượt {attempt.attempt_no}</span>
    <span className="w-24 font-semibold tabular-nums">{formatScore(attempt.score)}<span className="font-normal text-muted-foreground">/{formatScore(max)}</span></span>
    <span className="w-12 text-muted-foreground tabular-nums">{percent(attempt.score, max)}</span>
    <span className="text-muted-foreground tabular-nums">{shortDateTime(attempt.submitted_at)}</span>
    {attempt.is_late ? <Badge variant="warning">Muộn · trừ {attempt.late_penalty_percent}%</Badge> : null}
  </>;
  if (!attempt.review_available) {
    return <li className={ROW}>
      {content}
      <span className="ml-auto text-xs text-muted-foreground">
        {attempt.review_available_at ? `Xem lại từ ${shortDateTime(attempt.review_available_at)}` : "Không xem lại chi tiết"}
      </span>
    </li>;
  }
  return <li>
    <Link to={studentPaths.review(item.class_id, item.id, attempt.attempt_id)}
      className={`${ROW} rounded-sm outline-none transition-colors duration-150 hover:bg-secondary/60 focus-visible:ring-2 focus-visible:ring-ring`}>
      {content}
      <span className="ml-auto inline-flex items-center gap-1 font-medium">Xem lại<ChevronRight className="size-4 text-muted-foreground" aria-hidden /></span>
    </Link>
  </li>;
}

/** Quiz: lịch sử lượt dạng danh sách hàng (lượt · điểm · % · thời điểm · Xem lại). */
export function QuizAttemptsSection({ item, attempts, isPending, error, onRetry }: {
  item: AssignmentSummary; attempts: QuizAttempt[]; isPending: boolean; error: unknown; onRetry: () => void;
}) {
  return <section aria-labelledby="quiz-attempts-title">
    <div className="flex items-baseline gap-2 border-b pb-3">
      <h2 id="quiz-attempts-title" className="text-base font-semibold">Lịch sử lượt làm</h2>
      {attempts.length ? <span className="text-sm text-muted-foreground tabular-nums">{attempts.length}</span> : null}
    </div>
    {isPending ? <div aria-busy="true" aria-label="Đang tải" className="space-y-3 py-4"><Skeleton className="h-6" /><Skeleton className="h-6" /></div>
      : error ? <ErrorState error={error} onRetry={onRetry} />
      : attempts.length === 0 ? <EmptyState compact icon={History} title="Chưa có lượt nào" description="Kết quả từng lượt sẽ hiện ở đây sau khi bạn nộp." />
      : <ul>{attempts.map((attempt) => <AttemptRow key={attempt.attempt_id} attempt={attempt} item={item} />)}</ul>}
  </section>;
}
