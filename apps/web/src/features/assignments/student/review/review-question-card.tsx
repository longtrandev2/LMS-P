import { MarkdownView } from "@/components/markdown-view";
import { Badge } from "@/components/ui/badge";
import type { ReviewQuestion } from "@/types/api";
import { formatScore } from "../../submission-result";
import { AnswerInput } from "../answers/answer-input";
import { fromResponse } from "../answers/answer-model";
import { QuestionFrame } from "../question-frame";
import { isReviewPending, ProgrammingReview } from "./programming-review";

export type ReviewState = "correct" | "partial" | "wrong" | "blank" | "pending";

export function reviewState(row: ReviewQuestion): ReviewState {
  if (row.question.type === "programming") {
    if (row.submission_id == null) return "blank";
    if (isReviewPending(row)) return "pending";
  } else if (!row.response) return "blank";
  if (row.max_score > 0 && row.score >= row.max_score) return "correct";
  return row.score > 0 ? "partial" : "wrong";
}

export const REVIEW_STATE_LABEL: Record<ReviewState, string> = {
  correct: "Đúng", partial: "Đúng một phần", wrong: "Sai", blank: "Bỏ trống", pending: "Đang chấm",
};

/** Nền tô nhạt cùng màu chữ (ô số câu ở cột điều hướng). */
export const REVIEW_STATE_TONE: Record<ReviewState, string> = {
  correct: "bg-success/12 text-success hover:bg-success/20",
  partial: "bg-warning/14 text-warning hover:bg-warning/22",
  wrong: "bg-destructive/10 text-destructive hover:bg-destructive/18",
  blank: "bg-secondary text-muted-foreground hover:bg-accent",
  pending: "bg-info/10 text-info hover:bg-info/16",
};

const BADGE = { correct: "success", partial: "warning", wrong: "destructive", blank: "secondary", pending: "info" } as const satisfies Record<ReviewState, string>;

const noop = () => undefined;

/** Một câu trên màn xem lại: khung như khi làm quiz nhưng chỉ đọc, tô đúng/sai, đáp án và giải thích (khối nền xám). */
export function ReviewQuestionCard({ row, index, showsAnswers }: { row: ReviewQuestion; index: number; showsAnswers: boolean }) {
  const state = reviewState(row);
  const question = row.question;
  return <QuestionFrame id={`cau-${index + 1}`} className="scroll-mt-20" question={question} index={index} titleId={`review-q-${question.question_id}`}
    aside={<>
      <Badge variant={BADGE[state]}>{REVIEW_STATE_LABEL[state]}</Badge>
      <span className="font-semibold tabular-nums">{state === "pending" ? <span className="font-normal text-muted-foreground">— </span> : formatScore(row.score)}<span className="font-normal text-muted-foreground">/{formatScore(row.max_score)} điểm</span></span>
    </>}>
    <div className="space-y-5">
      {question.type === "programming" ? <ProgrammingReview row={row} /> : <>
        {state === "blank" ? <p className="text-sm text-muted-foreground">Bạn đã bỏ trống câu này.</p> : null}
        <AnswerInput question={question} value={fromResponse(row.response)} onChange={noop} readOnly
          correct={showsAnswers ? row.correct_answer : null} idPrefix={`review-${question.question_id}`} />
      </>}
      {showsAnswers && row.explanation?.trim() ? <div className="rounded-lg bg-secondary px-4 py-3">
        <p className="mb-1 text-xs font-semibold text-muted-foreground">Giải thích</p>
        <MarkdownView source={row.explanation} />
      </div> : null}
    </div>
  </QuestionFrame>;
}
