import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssignmentQuestion } from "@/types/api";
import { answerProgress, type DraftAnswer } from "../answers/answer-model";

const PROGRESS_TEXT = { empty: "chưa làm", partial: "làm chưa đủ", complete: "đã làm" };

/** Lưới điều hướng câu: đã làm / làm dở / đánh dấu / đang xem. */
export function QuizNavigator({ questions, answers, flagged, current, onSelect }: {
  questions: AssignmentQuestion[]; answers: Record<number, DraftAnswer>; flagged: number[];
  current: number; onSelect: (index: number) => void;
}) {
  return <nav aria-label="Danh sách câu hỏi" className="rounded-xl border bg-card p-3">
    <p className="mb-2 text-xs font-medium text-muted-foreground">Câu hỏi</p>
    <ol className="grid grid-cols-8 gap-1.5 sm:grid-cols-10 lg:grid-cols-5">
      {questions.map((question, index) => {
        const progress = answerProgress(question, answers[question.question_id]);
        const isFlagged = flagged.includes(question.question_id);
        const active = index === current;
        return <li key={question.question_id}>
          <button type="button" onClick={() => onSelect(index)} aria-current={active ? "step" : undefined}
            aria-label={`Câu ${index + 1}, ${PROGRESS_TEXT[progress]}${isFlagged ? ", đã đánh dấu" : ""}`}
            className={cn(
              "relative flex h-9 w-full items-center justify-center rounded-md border text-xs font-medium tabular-nums transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40",
              progress !== "empty" && "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15",
              progress === "partial" && "border-dashed",
              active && "border-foreground ring-1 ring-foreground")}>
            {index + 1}
            {isFlagged ? <Flag className="absolute -top-1.5 -right-1.5 size-3.5 fill-gold text-gold" aria-hidden /> : null}
          </button>
        </li>;
      })}
    </ol>
    <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground" aria-hidden>
      <li className="flex items-center gap-1"><span className="size-2.5 rounded-sm border border-primary/40 bg-primary/10" />Đã làm</li>
      <li className="flex items-center gap-1"><span className="size-2.5 rounded-sm border" />Chưa làm</li>
      <li className="flex items-center gap-1"><Flag className="size-3 fill-gold text-gold" />Đánh dấu</li>
    </ul>
  </nav>;
}
