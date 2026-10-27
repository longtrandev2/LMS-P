import type { ReactNode } from "react";
import { CircleCheck, CircleDot, CircleX, Clock, Hourglass, Send } from "lucide-react";
import type { QuizAttempt } from "@/types/api";
import { formatScore } from "../../submission-result";
import { shortDateTime } from "../labels";
import { MetaRow } from "../meta-row";

export interface ReviewCounts { correct: number; partial: number; wrong: number }

/** Đầu trang kết quả một lượt: tiêu đề + hành động, điểm lớn + %, hàng meta (nộp lúc · đúng · một phần · sai). */
export function AttemptScoreCard({ attempt, title, fallbackMax, reviewAvailable, counts, actions }: {
  attempt: QuizAttempt; title?: string; fallbackMax?: number; reviewAvailable: boolean; counts: ReviewCounts | null; actions?: ReactNode;
}) {
  const max = attempt.max_score ?? fallbackMax ?? 0;
  const percent = max > 0 ? Math.round((attempt.score / max) * 100) : null;
  return <header className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Kết quả lượt {attempt.attempt_no}</h1>
        {title ? <p className="text-sm text-muted-foreground">{title}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
    <section aria-label="Điểm lượt làm" className="space-y-3">
      <p className="flex flex-wrap items-baseline gap-x-3">
        <span className="text-5xl font-semibold tracking-tight tabular-nums">{formatScore(attempt.score)}</span>
        <span className="text-xl text-muted-foreground tabular-nums">/{formatScore(max)} điểm</span>
        {percent != null ? <span className="text-xl font-medium tabular-nums">{percent}%</span> : null}
      </p>
      {percent != null ? <div className="h-1 max-w-md overflow-hidden rounded-full bg-accent" aria-hidden>
        <div className="h-full rounded-full bg-foreground" style={{ width: `${Math.min(100, percent)}%` }} />
      </div> : null}
      <MetaRow items={[
        { icon: Send, text: `Nộp lúc ${shortDateTime(attempt.submitted_at)}` },
        attempt.is_late ? { icon: Hourglass, text: `Nộp muộn · đã trừ ${attempt.late_penalty_percent}%`, className: "text-warning" } : null,
        counts ? { icon: CircleCheck, text: `${counts.correct} đúng`, className: "text-success" } : null,
        counts && counts.partial ? { icon: CircleDot, text: `${counts.partial} đúng một phần`, className: "text-warning" } : null,
        counts ? { icon: CircleX, text: `${counts.wrong} sai hoặc bỏ trống`, className: counts.wrong ? "text-destructive" : undefined } : null,
      ]} />
    </section>
    {reviewAvailable ? null : <p className="flex items-start gap-2 rounded-lg bg-secondary px-4 py-3 text-sm text-muted-foreground">
      <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
      {attempt.review_available_at
        ? <span>Bạn sẽ xem lại được từng câu từ <strong className="font-medium text-foreground">{shortDateTime(attempt.review_available_at)}</strong>. Hiện chỉ hiển thị tổng điểm.</span>
        : <span>Giảng viên không mở xem lại chi tiết cho bài này — chỉ hiển thị tổng điểm.</span>}
    </p>}
  </header>;
}
