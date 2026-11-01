import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VerdictBadge } from "@/components/verdict-badge";
import { LANGUAGES } from "@/lib/languages";
import type { AssignmentQuestion, AssignmentSubmission, AssignmentSummary } from "@/types/api";
import { bestScore, bestVerdict, countedAttempts, formatScore, isGrading, sortLatestFirst } from "../../submission-result";
import { studentPaths } from "../paths";
import { QuestionCardHeader } from "./question-card-header";

/** Tiêu đề ngắn của đề: dòng đầu nội dung, bỏ ký hiệu Markdown. */
export function problemTitle(content: string): string {
  const line = content.split("\n").map((row) => row.replace(/^[#>*\-\s]+/, "").replace(/[`*_]/g, "").trim()).find(Boolean) ?? "";
  return line.length > 90 ? `${line.slice(0, 90)}…` : line;
}

const shortLanguage = (id: string) => LANGUAGES.find((item) => item.id === id)?.short ?? id;

/** Hàng câu lập trình: verdict tốt nhất + điểm + nút xám "Mở workspace". */
export function ProgrammingQuestionCard({ item, question, index, submissions }: {
  item: AssignmentSummary; question: AssignmentQuestion; index: number; submissions: AssignmentSubmission[];
}) {
  const verdict = bestVerdict(submissions);
  const score = bestScore(submissions);
  const grading = sortLatestFirst(submissions).some((row) => isGrading(row.status));
  const programming = question.programming;
  const used = countedAttempts(submissions);
  const meta = [
    `${formatScore(question.points)} điểm`,
    programming ? `${programming.time_limit_ms} ms · ${programming.memory_limit_mb} MB` : null,
    programming?.allowed_languages.length ? programming.allowed_languages.map(shortLanguage).join(", ") : null,
    item.max_attempts == null ? `${used} lượt nộp` : `${used}/${item.max_attempts} lượt`,
    score != null ? `cao nhất ${formatScore(score)}/${formatScore(question.points)}` : null,
  ].filter(Boolean).join(" · ");
  const status = grading ? <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden />Đang chấm</span>
    : verdict ? <VerdictBadge verdict={verdict} /> : <span className="text-muted-foreground">Chưa nộp</span>;

  return <li className="border-b py-4" aria-labelledby={`q-${question.question_id}-title`}>
    <QuestionCardHeader index={index} question={question} titleId={`q-${question.question_id}-title`}
      title={problemTitle(question.content) || "Bài lập trình"} meta={meta} status={status}
      action={<Button asChild variant="secondary">
        <Link to={studentPaths.problem(item.class_id, item.id, question.question_id)}>Mở workspace</Link>
      </Button>} />
  </li>;
}
