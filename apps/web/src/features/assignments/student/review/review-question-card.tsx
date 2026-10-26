import { MarkdownView } from "@/components/markdown-view";
import { questionTypeLabel } from "@/lib/question-types";
import { cn } from "@/lib/utils";
import type { ReviewQuestion } from "@/types/api";
import { formatScore } from "../../submission-result";
import { AnswerInput, QuestionPrompt } from "../answers/answer-input";
import { fromResponse } from "../answers/answer-model";

export type ReviewState = "correct" | "partial" | "wrong" | "blank";

export function reviewState(row: ReviewQuestion): ReviewState {
  if (!row.response) return "blank";
  if (row.max_score > 0 && row.score >= row.max_score) return "correct";
  return row.score > 0 ? "partial" : "wrong";
}

export const REVIEW_STATE_LABEL: Record<ReviewState, string> = {
  correct: "Đúng", partial: "Đúng một phần", wrong: "Sai", blank: "Bỏ trống",
};

export const REVIEW_STATE_TONE: Record<ReviewState, string> = {
  correct: "border-success/30 bg-success/10 text-success",
  partial: "border-warning/30 bg-warning/10 text-warning",
  wrong: "border-destructive/30 bg-destructive/10 text-destructive",
  blank: "border-border bg-muted text-muted-foreground",
};

const noop = () => undefined;

/** Một câu trên màn xem lại: câu trả lời (chỉ đọc), điểm, đúng/sai, đáp án và giải thích khi được hiện. */
export function ReviewQuestionCard({ row, index, showsAnswers }: { row: ReviewQuestion; index: number; showsAnswers: boolean }) {
  const state = reviewState(row);
  const question = row.question;
  const titleId = `review-q-${question.question_id}`;
  return <article id={`cau-${index + 1}`} aria-labelledby={titleId} className="scroll-mt-28 rounded-xl border bg-card">
    <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-3 sm:px-5">
      <h2 id={titleId} className="text-sm font-semibold">Câu {index + 1}</h2>
      <span className="text-xs text-muted-foreground">{questionTypeLabel(question.type)}</span>
      <span className="ml-auto flex items-center gap-2">
        <span className={cn("rounded-md border px-2 py-0.5 text-xs font-medium", REVIEW_STATE_TONE[state])}>{REVIEW_STATE_LABEL[state]}</span>
        <span className="font-mono text-sm font-semibold tabular-nums">{formatScore(row.score)}<span className="text-muted-foreground">/{formatScore(row.max_score)}</span></span>
      </span>
    </header>
    <div className="space-y-5 p-4 sm:p-5">
      <QuestionPrompt question={question} />
      {state === "blank" ? <p className="text-xs font-medium text-muted-foreground">Bạn đã bỏ trống câu này.</p> : null}
      <AnswerInput question={question} value={fromResponse(row.response)} onChange={noop} readOnly
        correct={showsAnswers ? row.correct_answer : null} idPrefix={`review-${question.question_id}`} />
      {showsAnswers && row.explanation?.trim() ? <div className="border-t pt-4">
        <p className="mb-1 text-xs font-semibold text-muted-foreground">Giải thích</p>
        <MarkdownView source={row.explanation} />
      </div> : null}
    </div>
  </article>;
}
