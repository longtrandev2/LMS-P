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
              "relative flex h-9 w-full items-center justify-center rounded-md border text-xs font-medium tabular-nums transition-colors duration-150 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              progress === "complete" && "border-foreground bg-foreground text-background hover:bg-foreground/85",
              progress === "partial" && "border-dashed border-foreground/60 bg-accent",
              active && "ring-2 ring-foreground ring-offset-2 ring-offset-card")}>
            {index + 1}
            {isFlagged ? <span className="absolute -top-1 -right-1 size-2.5 rounded-full border-2 border-card bg-warning" aria-hidden /> : null}
          </button>
        </li>;
      })}
    </ol>
    <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground" aria-hidden>
      <li className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-foreground" />Đã làm</li>
      <li className="flex items-center gap-1"><span className="size-2.5 rounded-sm border border-dashed border-foreground/60 bg-accent" />Làm dở</li>
      <li className="flex items-center gap-1"><span className="size-2.5 rounded-sm border" />Chưa làm</li>
      <li className="flex items-center gap-1"><span className="size-2 rounded-full bg-warning" />Đánh dấu</li>
    </ul>
  </nav>;
}
