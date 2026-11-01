import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AssignmentQuestion } from "@/types/api";
import { formatScore } from "../../submission-result";
import { AnswerInput } from "../answers/answer-input";
import type { DraftAnswer } from "../answers/answer-model";
import { QuestionFrame } from "../question-frame";

/** Một câu quiz trong khung kiểu Frappe: đề, các thanh lựa chọn, chân khung `Câu x/n` + Đánh dấu / Trước / Sau. */
export function QuizQuestionView({ question, index, total, value, onChange, flagged, onToggleFlag, onPrev, onNext, onSubmit }: {
  question: AssignmentQuestion; index: number; total: number; value: DraftAnswer; onChange: (value: DraftAnswer) => void;
  flagged: boolean; onToggleFlag: () => void; onPrev: () => void; onNext: () => void; onSubmit: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    // Chuyển câu: đưa focus về tiêu đề câu để trình đọc màn hình đọc câu mới.
    if (firstRender.current) { firstRender.current = false; return; }
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView({ block: "nearest" });
  }, [question.question_id]);

  const isLast = index === total - 1;
  const footer = <>
    <span className="text-sm text-muted-foreground tabular-nums">Câu {index + 1}/{total}</span>
    <div className="ml-auto flex flex-wrap items-center gap-2">
      <Button type="button" variant="secondary" aria-pressed={flagged} onClick={onToggleFlag}
        className={cn(flagged && "bg-warning/12 text-warning hover:bg-warning/18")}>
        <Flag className={flagged ? "fill-current" : undefined} aria-hidden />{flagged ? "Đã đánh dấu" : "Đánh dấu"}
      </Button>
      <Button type="button" variant="secondary" disabled={index === 0} onClick={onPrev}
        aria-keyshortcuts="ArrowLeft" title="Câu trước (phím ←)">
        <ChevronLeft aria-hidden />Trước
      </Button>
      {isLast ? <Button type="button" onClick={onSubmit}>Nộp bài</Button>
        : <Button type="button" variant="secondary" onClick={onNext} aria-keyshortcuts="ArrowRight" title="Câu sau (phím →)">
          Sau<ChevronRight aria-hidden />
        </Button>}
    </div>
  </>;

  return <QuestionFrame question={question} index={index} titleId={`quiz-q-${question.question_id}`} headingRef={headingRef}
    aside={<span className="font-semibold tabular-nums">{formatScore(question.points)} điểm</span>} footer={footer}>
    <AnswerInput key={question.question_id} question={question} value={value} onChange={onChange} idPrefix={`quiz-${question.question_id}`} />
  </QuestionFrame>;
}
