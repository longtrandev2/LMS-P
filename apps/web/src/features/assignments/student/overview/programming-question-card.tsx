import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VerdictBadge } from "@/components/verdict-badge";
import { languageLabel } from "@/lib/languages";
import type { AssignmentQuestion, AssignmentSubmission, AssignmentSummary } from "@/types/api";
import { bestScore, bestVerdict, countedAttempts, formatScore, isGrading, sortLatestFirst } from "../../submission-result";
import { attemptsText } from "../labels";
import { studentPaths } from "../paths";
import { QuestionCardHeader } from "./question-card-header";

/** Tiêu đề ngắn của đề: dòng đầu nội dung, bỏ ký hiệu Markdown. */
export function problemTitle(content: string): string {
  const line = content.split("\n").map((row) => row.replace(/^[#>*\-\s]+/, "").replace(/[`*_]/g, "").trim()).find(Boolean) ?? "";
  return line.length > 90 ? `${line.slice(0, 90)}…` : line;
}

/** Câu lập trình: verdict tốt nhất + mở workspace. */
export function ProgrammingQuestionCard({ item, question, index, submissions }: {
  item: AssignmentSummary; question: AssignmentQuestion; index: number; submissions: AssignmentSubmission[];
}) {
  const verdict = bestVerdict(submissions);
  const score = bestScore(submissions);
  const grading = sortLatestFirst(submissions).some((row) => isGrading(row.status));
  const programming = question.programming;
  const status = grading ? <span className="text-muted-foreground">Đang chấm…</span>
    : verdict ? <VerdictBadge verdict={verdict} /> : <span className="text-muted-foreground">Chưa nộp</span>;

  return <article className="rounded-xl border bg-card" aria-labelledby={`q-${question.question_id}-title`}>
    <QuestionCardHeader index={index} question={question} titleId={`q-${question.question_id}-title`} status={status} />
    <div className="flex flex-wrap items-center justify-between gap-4 p-4">
      <div className="min-w-0 space-y-1">
        <p className="truncate text-sm font-medium">{problemTitle(question.content) || "Bài lập trình"}</p>
        <p className="text-xs text-muted-foreground">
          {programming ? `${programming.time_limit_ms} ms · ${programming.memory_limit_mb} MB · ${programming.allowed_languages.map(languageLabel).join(", ")}` : null}
        </p>
        <p className="text-xs text-muted-foreground">
          {attemptsText(countedAttempts(submissions), item.max_attempts)}
          {score != null ? ` · điểm cao nhất ${formatScore(score)}/${formatScore(question.points)}` : ""}
        </p>
      </div>
      <Button asChild size="sm" variant="outline">
        <Link to={studentPaths.problem(item.class_id, item.id, question.question_id)}>Mở workspace<ArrowRight aria-hidden /></Link>
      </Button>
    </div>
  </article>;
}
