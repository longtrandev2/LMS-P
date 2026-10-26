import { formatUtcDateTime } from "@/lib/date-time";
import { languageLabel } from "@/lib/languages";
import { questionTypeLabel } from "@/lib/question-types";
import { formatPoints } from "@/features/assignments/lecturer/labels";
import { SubmissionStatusBadge } from "./submission-status";
import type { AssignmentQuestion, GradingResultView, SubmissionDetails } from "@/types/api";

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-0.5 text-sm font-medium">{children}</dd></div>;
}

/** Thẻ tóm tắt bài nộp: ai, câu nào, lượt, ngôn ngữ, thời điểm, muộn, điểm, verdict, tiến độ test. */
export function SubmissionSummaryCard({ submission, result, question, position, showScore }: {
  submission: SubmissionDetails; result: GradingResultView | null | undefined; question?: AssignmentQuestion;
  position?: number; showScore: boolean;
}) {
  const code = submission.type === "code";
  const failedAt = result?.failed_test;
  return <section aria-label="Tóm tắt bài nộp" className="rounded-xl border bg-card">
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-5 py-4">
      <SubmissionStatusBadge status={submission.status} verdict={submission.verdict} className="text-sm" />
      {code && result?.tests_total ? <span className="text-sm">
        Đạt <span className="font-semibold tabular-nums">{result.tests_passed ?? 0}/{result.tests_total}</span> test
      </span> : null}
      {code && failedAt ? <span className="text-sm text-destructive">Sai ở test #{failedAt}</span> : null}
      {result?.compile_error ? <span className="text-sm text-destructive">Biên dịch không thành công</span> : null}
      <span className="ml-auto text-sm">
        {showScore ? <>Điểm <span className="font-heading text-xl font-semibold tabular-nums">{formatPoints(submission.score)}</span>
          {submission.max_score != null ? <span className="text-muted-foreground"> / {formatPoints(submission.max_score)}</span> : null}</>
          : <span className="text-muted-foreground">Điểm hiện khi được xem lại</span>}
      </span>
    </div>
    <dl className="grid grid-cols-2 gap-4 px-5 py-4 sm:grid-cols-3 lg:grid-cols-6">
      <Item label="Sinh viên">
        <span className="block truncate">{submission.student_full_name ?? `#${submission.student_id}`}</span>
        {submission.student_code ? <span className="block font-mono text-xs font-normal text-muted-foreground">{submission.student_code}</span> : null}
      </Item>
      <Item label="Câu">{position ? `Câu ${position}` : `#${submission.question_id}`}{question ? <span className="block text-xs font-normal text-muted-foreground">{questionTypeLabel(question.type)}</span> : null}</Item>
      <Item label="Lượt">{submission.attempt_no}</Item>
      <Item label="Ngôn ngữ">{code ? languageLabel(submission.language) || "—" : "—"}</Item>
      <Item label="Nộp lúc"><span className="tabular-nums">{formatUtcDateTime(submission.submitted_at)}</span></Item>
      <Item label="Nộp muộn">{submission.is_late ? <span className="text-gold">Có</span> : "Không"}</Item>
    </dl>
  </section>;
}
