import { useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { questionTypeLabel } from "@/lib/question-types";
import type { AssignmentQuestion } from "@/types/api";
import { formatScore } from "../../submission-result";
import { AnswerInput, QuestionPrompt } from "../answers/answer-input";
import type { DraftAnswer } from "../answers/answer-model";

/** Một câu quiz: nội dung, ô trả lời, đánh dấu, Trước/Sau. */
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

  const titleId = `quiz-q-${question.question_id}`;
  const isLast = index === total - 1;
  return <section aria-labelledby={titleId} className="rounded-xl border bg-card">
    <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-5 py-3">
      <h2 id={titleId} ref={headingRef} tabIndex={-1} className="scroll-mt-48 text-sm font-semibold outline-none">
        Câu {index + 1}<span className="font-normal text-muted-foreground">/{total}</span>
      </h2>
      <span className="text-xs text-muted-foreground">{questionTypeLabel(question.type)} · {formatScore(question.points)} điểm</span>
      <Button type="button" size="xs" variant={flagged ? "secondary" : "ghost"} className="ml-auto" aria-pressed={flagged} onClick={onToggleFlag}>
        <Flag className={flagged ? "fill-gold text-gold" : undefined} aria-hidden />{flagged ? "Đã đánh dấu" : "Đánh dấu xem lại"}
      </Button>
    </header>
    <div className="space-y-6 px-5 py-5">
      <QuestionPrompt question={question} className="text-[15px]" />
      <AnswerInput key={question.question_id} question={question} value={value} onChange={onChange} idPrefix={`quiz-${question.question_id}`} />
    </div>
    <footer className="flex items-center justify-between gap-3 border-t px-5 py-3">
      <Button type="button" variant="outline" size="sm" disabled={index === 0} onClick={onPrev} aria-keyshortcuts="ArrowLeft">
        <ArrowLeft aria-hidden />Câu trước
      </Button>
      <span className="hidden text-xs text-muted-foreground md:inline">Phím <kbd className="rounded border px-1 font-mono">←</kbd> <kbd className="rounded border px-1 font-mono">→</kbd> để chuyển câu</span>
      {isLast ? <Button type="button" variant="cta" size="sm" onClick={onSubmit}>Nộp bài</Button>
        : <Button type="button" variant="outline" size="sm" onClick={onNext} aria-keyshortcuts="ArrowRight">Câu sau<ArrowRight aria-hidden /></Button>}
    </footer>
  </section>;
}
