import { CalendarClock, Code2, Hourglass, ListChecks, Loader2, RotateCcw, UserRound } from "lucide-react";
import { languageLabel } from "@/lib/languages";
import { questionTypeLabel } from "@/lib/question-types";
import { cn } from "@/lib/utils";
import { VERDICT_LABEL, verdictTone } from "@/lib/verdicts";
import { formatPoints, shortDateTime, STATUS_LABEL } from "@/features/assignments/lecturer/labels";
import { MetaItem, MetaRow } from "@/features/assignments/lecturer/meta-row";
import { isGrading } from "./submission-status";
import type { AssignmentQuestion, GradingResultView, SubmissionDetails } from "@/types/api";

const TONE_TEXT = { success: "text-success", danger: "text-destructive", warning: "text-warning", neutral: "text-foreground" } as const;

/**
 * Đầu trang chi tiết bài nộp (DESIGN.md §4): ngữ cảnh (bài · câu) → verdict lớn → hàng meta
 * (sinh viên · điểm · ngôn ngữ · thời điểm · lượt · test · muộn). Hành động bên phải.
 */
export function SubmissionHeader({ submission, result, question, position, assignmentTitle, showScore, action }: {
  submission: SubmissionDetails; result: GradingResultView | null | undefined; question?: AssignmentQuestion;
  position?: number; assignmentTitle?: string; showScore: boolean; action?: React.ReactNode;
}) {
  const code = submission.type === "code";
  const verdict = submission.verdict;
  const grading = isGrading(submission.status);
  const score = showScore && submission.score != null
    ? <><span className="font-semibold text-foreground">{formatPoints(submission.score)}</span>{submission.max_score != null ? ` / ${formatPoints(submission.max_score)}` : ""} điểm</>
    : null;
  const scoreTitle = !grading && !verdict && !code && score != null;
  const title = grading ? STATUS_LABEL[submission.status]
    : verdict ? VERDICT_LABEL[verdict]
      : scoreTitle ? score
        : STATUS_LABEL[submission.status];
  const context = [assignmentTitle, position ? `Câu ${position}` : `Câu #${submission.question_id}`, question ? questionTypeLabel(question.type) : null]
    .filter(Boolean).join(" · ");
  const failedAt = result?.failed_test;

  return <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
    <div className="min-w-0 space-y-2">
      <p className="truncate text-sm text-muted-foreground">{context}</p>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className={cn("inline-flex items-center gap-2 text-2xl font-semibold", grading ? "text-muted-foreground" : TONE_TEXT[verdictTone(verdict)])}>
          {grading ? <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden /> : null}{title}
        </h1>
        {verdict ? <span className="font-mono text-sm text-muted-foreground">{verdict === "SYSTEM_ERROR" ? "SE" : verdict}</span> : null}
        {code && failedAt ? <span className="text-sm text-destructive">sai ở test #{failedAt}</span> : null}
        {result?.compile_error ? <span className="text-sm text-destructive">biên dịch không thành công</span> : null}
      </div>
      <MetaRow>
        <MetaItem icon={UserRound}>
          <span className="text-foreground">{submission.student_full_name ?? `Sinh viên #${submission.student_id}`}</span>
          {submission.student_code ? <span className="ml-1.5 font-mono text-xs">{submission.student_code}</span> : null}
        </MetaItem>
        {score && !scoreTitle ? <MetaItem>{score}</MetaItem> : showScore ? null : <MetaItem>Điểm hiện khi được xem lại</MetaItem>}
        {code && submission.language ? <MetaItem icon={Code2}>{languageLabel(submission.language)}</MetaItem> : null}
        {code && result?.tests_total ? <MetaItem icon={ListChecks}>{result.tests_passed ?? 0}/{result.tests_total} test</MetaItem> : null}
        <MetaItem icon={CalendarClock}>{shortDateTime(submission.submitted_at)}</MetaItem>
        <MetaItem icon={RotateCcw}>Lượt {submission.attempt_no}</MetaItem>
        {submission.is_late ? <MetaItem icon={Hourglass} className="text-warning">Nộp muộn</MetaItem> : null}
      </MetaRow>
    </div>
    {action}
  </header>;
}
