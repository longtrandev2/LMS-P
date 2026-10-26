import { Clock } from "lucide-react";
import { formatUtcDateTime } from "@/lib/date-time";
import type { QuizAttempt } from "@/types/api";
import { formatScore } from "../../submission-result";

/** Thẻ điểm của một lượt: điểm/tối đa, %, muộn, thời điểm; kèm thông báo khi chưa được xem lại. */
export function AttemptScoreCard({ attempt, fallbackMax, reviewAvailable, summary }: {
  attempt: QuizAttempt; fallbackMax?: number; reviewAvailable: boolean; summary?: string;
}) {
  const max = attempt.max_score ?? fallbackMax ?? 0;
  const percent = max > 0 ? Math.round((attempt.score / max) * 100) : null;
  return <section aria-label="Điểm lượt làm" className="overflow-hidden rounded-xl border bg-card">
    <div className="flex flex-wrap items-end gap-x-8 gap-y-4 p-5">
      <div>
        <p className="text-xs font-medium text-muted-foreground">Điểm lượt {attempt.attempt_no}</p>
        <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums">
          {formatScore(attempt.score)}<span className="text-xl text-muted-foreground">/{formatScore(max)}</span>
        </p>
      </div>
      {percent != null ? <div>
        <p className="text-xs font-medium text-muted-foreground">Tỉ lệ</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{percent}%</p>
      </div> : null}
      <dl className="ml-auto grid gap-1 text-xs text-muted-foreground sm:text-right">
        <div><dt className="inline">Nộp lúc </dt><dd className="inline font-medium text-foreground tabular-nums">{formatUtcDateTime(attempt.submitted_at)}</dd></div>
        {attempt.is_late ? <div><dt className="sr-only">Nộp muộn</dt><dd className="text-warning">Nộp muộn · đã trừ {attempt.late_penalty_percent}%</dd></div> : null}
        {summary ? <div><dt className="sr-only">Tóm tắt</dt><dd>{summary}</dd></div> : null}
      </dl>
    </div>
    {percent != null ? <div className="h-1 bg-muted" aria-hidden><div className="h-full bg-foreground" style={{ width: `${Math.min(100, percent)}%` }} /></div> : null}
    {reviewAvailable ? null : <p className="flex items-start gap-2 border-t px-5 py-3 text-sm text-muted-foreground">
      <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
      {attempt.review_available_at
        ? <span>Bạn sẽ xem lại được từng câu từ <strong className="font-medium text-foreground">{formatUtcDateTime(attempt.review_available_at)}</strong>. Hiện chỉ hiển thị tổng điểm.</span>
        : <span>Giảng viên không mở xem lại chi tiết cho bài này — chỉ hiển thị tổng điểm.</span>}
    </p>}
  </section>;
}
