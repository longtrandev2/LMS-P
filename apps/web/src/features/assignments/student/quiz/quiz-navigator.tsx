import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AssignmentQuestion } from "@/types/api";
import { answerProgress, type DraftAnswer } from "../answers/answer-model";

const PROGRESS_TEXT = { empty: "chưa làm", partial: "làm chưa đủ", complete: "đã làm" };

/**
 * Cột phải trang làm quiz, kiểu mục lục khóa học Frappe: tiêu đề + "Đã làm x/n" + thanh tiến độ mảnh trên nền xám,
 * lưới số câu (đã làm đen / làm dở viền đứt / đánh dấu chấm cam / đang xem vòng), nút đen "Nộp bài".
 */
export function QuizNavigator({ title, questions, answers, flagged, current, onSelect, answered, onSubmit, submitting, note }: {
  title: string; questions: AssignmentQuestion[]; answers: Record<number, DraftAnswer>; flagged: number[];
  current: number; onSelect: (index: number) => void; answered: number; onSubmit: () => void; submitting: boolean; note: string;
}) {
  const total = questions.length;
  const percent = total ? Math.round((answered / total) * 100) : 0;
  return <div className="flex h-full flex-col">
    <div className="border-b bg-sidebar px-5 py-5">
      <p className="truncate text-base font-semibold" title={title}>{title}</p>
      <p className="mt-1.5 text-sm text-muted-foreground tabular-nums">Đã làm {answered}/{total}</p>
      <div role="progressbar" aria-label="Tiến độ làm bài" aria-valuemin={0} aria-valuemax={total} aria-valuenow={answered}
        className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-accent">
        <div className="h-full rounded-full bg-foreground transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${percent}%` }} />
      </div>
    </div>
    <nav aria-label="Danh sách câu hỏi" className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
      <p className="mb-3 text-sm font-medium">Câu hỏi</p>
      <ol className="grid grid-cols-8 gap-2 sm:grid-cols-10 lg:grid-cols-5">
        {questions.map((question, index) => {
          const progress = answerProgress(question, answers[question.question_id]);
          const isFlagged = flagged.includes(question.question_id);
          const active = index === current;
          return <li key={question.question_id}>
            <button type="button" onClick={() => onSelect(index)} aria-current={active ? "step" : undefined}
              aria-label={`Câu ${index + 1}, ${PROGRESS_TEXT[progress]}${isFlagged ? ", đã đánh dấu" : ""}`}
              className={cn(
                "relative flex h-9 w-full items-center justify-center rounded-md border border-transparent bg-secondary text-sm tabular-nums transition-colors duration-150 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
                progress === "complete" && "bg-foreground font-medium text-background hover:bg-foreground/85",
                progress === "partial" && "border-dashed border-foreground/50 bg-accent",
                active && "ring-2 ring-foreground ring-offset-2 ring-offset-background")}>
              {index + 1}
              {isFlagged ? <span className="absolute -top-1 -right-1 size-2.5 rounded-full border-2 border-background bg-warning" aria-hidden /> : null}
            </button>
          </li>;
        })}
      </ol>
      <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-muted-foreground" aria-hidden>
        <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-foreground" />Đã làm</li>
        <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm border border-dashed border-foreground/50 bg-accent" />Làm dở</li>
        <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-secondary ring-1 ring-border" />Chưa làm</li>
        <li className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-warning" />Đánh dấu</li>
      </ul>
      <div className="mt-6 space-y-2">
        <Button className="w-full" onClick={onSubmit} disabled={submitting}>
          {submitting ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden /> : null}
          {submitting ? "Đang nộp…" : "Nộp bài"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">{note}</p>
      </div>
    </nav>
  </div>;
}
