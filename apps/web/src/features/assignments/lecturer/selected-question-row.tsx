import { ArrowDown, ArrowUp, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { questionTypeLabel } from "@/lib/question-types";
import { cn } from "@/lib/utils";
import { DIFFICULTY_LABEL, plainExcerpt } from "./labels";
import type { SelectedQuestion } from "./editor-model";

/**
 * Một câu trong đề — hàng nền xám bo góc (DESIGN.md §4 "Trang soạn"):
 * số thứ tự · nội dung + loại/độ khó · ô điểm · xem trước ↑ ↓ ×.
 */
export function SelectedQuestionRow({ index, count, question, error, invalidType, locked, onPoints, onMove, onRemove, onPreview }: {
  index: number; count: number; question: SelectedQuestion; error?: string; invalidType: boolean; locked: boolean;
  onPoints: (value: string) => void; onMove: (direction: -1 | 1) => void; onRemove: () => void; onPreview: () => void;
}) {
  const pointsId = `points-${question.question_id}`;
  return <li className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg px-3 py-2.5 sm:flex-nowrap",
    invalidType ? "bg-destructive/8" : "bg-secondary")}>
    <span className="w-6 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">{String(index + 1).padStart(2, "0")}</span>
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm">{plainExcerpt(question.content) || `Câu hỏi #${question.question_id}`}</p>
      <p className="flex min-w-0 items-center gap-x-1.5 text-xs text-muted-foreground">
        <span className={cn(invalidType && "font-medium text-destructive")}>{questionTypeLabel(question.type)}</span>
        <span aria-hidden>·</span><span>{DIFFICULTY_LABEL[question.difficulty]}</span>
        {question.bank_name ? <><span aria-hidden>·</span><span className="truncate">{question.bank_name}</span></> : null}
        {invalidType ? <><span aria-hidden>·</span><span className="font-medium text-destructive">Quiz không nhận câu lập trình</span></> : null}
      </p>
    </div>
    <div className="ml-9 flex shrink-0 items-center gap-0.5 sm:ml-0">
      <div className="mr-1.5">
        <label htmlFor={pointsId} className="sr-only">Điểm câu {index + 1}</label>
        <div className="relative">
          <Input id={pointsId} type="number" inputMode="decimal" min={0.01} step={0.25} value={question.points} disabled={locked}
            aria-invalid={error ? true : undefined} aria-describedby={error ? `${pointsId}-error` : undefined}
            className="h-7 w-20 bg-background pr-6 text-right tabular-nums hover:bg-background" onChange={(event) => onPoints(event.target.value)} />
          <span aria-hidden className="pointer-events-none absolute inset-y-0 right-2 grid place-items-center text-xs text-muted-foreground">đ</span>
        </div>
        {error ? <p id={`${pointsId}-error`} className="mt-1 max-w-20 text-xs text-destructive">{error}</p> : null}
      </div>
      <Button type="button" variant="ghost" size="icon-sm" className="hover:bg-accent" aria-label={`Xem trước câu ${index + 1}`} onClick={onPreview}><Eye aria-hidden /></Button>
      {locked ? null : <>
        <Button type="button" variant="ghost" size="icon-sm" className="hover:bg-accent" aria-label={`Đưa câu ${index + 1} lên`} disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp aria-hidden /></Button>
        <Button type="button" variant="ghost" size="icon-sm" className="hover:bg-accent" aria-label={`Đưa câu ${index + 1} xuống`} disabled={index === count - 1} onClick={() => onMove(1)}><ArrowDown aria-hidden /></Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Bỏ câu ${index + 1} khỏi đề`} className="text-muted-foreground hover:bg-accent hover:text-destructive" onClick={onRemove}><X aria-hidden /></Button>
      </>}
    </div>
  </li>;
}
