import { Link } from "react-router-dom";
import { ArrowRight, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/state-blocks";
import { formatUtcDateTime } from "@/lib/date-time";
import { useAuthStore } from "@/stores/auth";
import type { AssignmentSummary, QuizAttempt } from "@/types/api";
import { acceptsSubmissions, assignmentWindow } from "../../submission-window";
import { formatScore } from "../../submission-result";
import { remainingAttempts } from "../labels";
import { draftKeys, readDraft } from "../local-draft";
import { studentPaths } from "../paths";

function percent(score: number, max: number): string {
  return max > 0 ? `${Math.round((score / max) * 100)}%` : "—";
}

function AttemptRow({ attempt, item }: { attempt: QuizAttempt; item: AssignmentSummary }) {
  const max = attempt.max_score ?? item.total_points;
  return <li className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
    <span className="w-16 text-sm font-medium">Lượt {attempt.attempt_no}</span>
    <span className="font-mono text-sm font-semibold tabular-nums">{formatScore(attempt.score)}<span className="text-muted-foreground">/{formatScore(max)}</span></span>
    <span className="text-xs text-muted-foreground tabular-nums">{percent(attempt.score, max)}</span>
    <span className="text-xs text-muted-foreground tabular-nums">{formatUtcDateTime(attempt.submitted_at)}</span>
    {attempt.is_late ? <Badge variant="warning">Muộn · trừ {attempt.late_penalty_percent}%</Badge> : null}
    <span className="ml-auto">
      {attempt.review_available ? <Button asChild size="xs" variant="outline">
        <Link to={studentPaths.review(item.class_id, item.id, attempt.attempt_id)}>Xem lại</Link>
      </Button> : <span className="text-xs text-muted-foreground">
        {attempt.review_available_at ? `Xem lại từ ${formatUtcDateTime(attempt.review_available_at)}` : "Không xem lại chi tiết"}
      </span>}
    </span>
  </li>;
}

/** Quiz: nút bắt đầu/làm lại + lịch sử lượt. */
export function QuizAttemptsSection({ item, attempts, isPending, error, onRetry }: {
  item: AssignmentSummary; attempts: QuizAttempt[]; isPending: boolean; error: unknown; onRetry: () => void;
}) {
  const userId = useAuthStore((state) => state.user?.id);
  const window = assignmentWindow(item);
  const remaining = remainingAttempts(attempts.length, item.max_attempts);
  const hasDraft = userId != null && readDraft(draftKeys.quiz(userId, item.id, attempts.length + 1)) != null;
  const blocked = !acceptsSubmissions(window) ? (window === "upcoming" ? "Bài chưa mở." : "Bài đã đóng, không nhận lượt mới.")
    : remaining === 0 ? "Bạn đã dùng hết lượt làm bài." : null;
  const label = hasDraft ? "Tiếp tục làm bài" : attempts.length ? "Làm lại" : "Bắt đầu làm bài";

  return <section aria-labelledby="quiz-attempts-title" className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
      <div className="space-y-0.5">
        <p className="text-sm font-semibold tabular-nums">{item.question_count} câu · {item.total_points} điểm</p>
        <p className="text-xs text-muted-foreground">
          {blocked ?? (window === "late" ? `Đang trong hạn nộp muộn — điểm lượt mới bị trừ ${item.late_penalty_percent}%.` : "Nháp được lưu tự động trên trình duyệt này.")}
        </p>
      </div>
      {blocked || isPending ? <Button variant="cta" disabled>{isPending ? "Đang tải…" : label}</Button>
        : <Button asChild variant="cta"><Link to={studentPaths.attempt(item.class_id, item.id)}>{label}<ArrowRight aria-hidden /></Link></Button>}
    </div>
    <div className="rounded-xl border bg-card">
      <h2 id="quiz-attempts-title" className="border-b px-4 py-3 text-sm font-semibold">Lịch sử lượt làm</h2>
      {isPending ? <div aria-busy="true" aria-label="Đang tải" className="space-y-2 p-4"><Skeleton className="h-8" /><Skeleton className="h-8" /></div>
        : error ? <ErrorState error={error} onRetry={onRetry} />
        : attempts.length === 0 ? <EmptyState compact icon={History} title="Chưa có lượt nào" description="Kết quả từng lượt sẽ hiện ở đây sau khi bạn nộp." />
        : <ul className="divide-y">{attempts.map((attempt) => <AttemptRow key={attempt.attempt_id} attempt={attempt} item={item} />)}</ul>}
    </div>
  </section>;
}
