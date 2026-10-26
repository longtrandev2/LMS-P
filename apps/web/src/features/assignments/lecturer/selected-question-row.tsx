import { ArrowDown, ArrowUp, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { questionTypeLabel } from "@/lib/question-types";
import { cn } from "@/lib/utils";
import { DIFFICULTY_LABEL, plainExcerpt } from "./labels";
import type { SelectedQuestion } from "./editor-model";

/** Một câu trong đề: thứ tự, loại, nội dung rút gọn, điểm, đổi thứ tự, xem trước, bỏ. */
export function SelectedQuestionRow({ index, count, question, error, invalidType, locked, onPoints, onMove, onRemove, onPreview }: {
  index: number; count: number; question: SelectedQuestion; error?: string; invalidType: boolean; locked: boolean;
  onPoints: (value: string) => void; onMove: (direction: -1 | 1) => void; onRemove: () => void; onPreview: () => void;
}) {
  const pointsId = `points-${question.question_id}`;
  return <li className={cn("grid grid-cols-[2rem_1fr] gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[2rem_1fr_auto]", invalidType && "bg-destructive/5")}>
    <span className="pt-0.5 font-mono text-xs text-muted-foreground tabular-nums">{String(index + 1).padStart(2, "0")}</span>
    <div className="min-w-0 space-y-1">
      <p className="line-clamp-2 text-sm leading-6">{plainExcerpt(question.content) || `Câu hỏi #${question.question_id}`}</p>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span className={cn("font-medium", invalidType ? "text-destructive" : "text-foreground/80")}>{questionTypeLabel(question.type)}</span>
        <span aria-hidden>·</span><span>{DIFFICULTY_LABEL[question.difficulty]}</span>
        {question.bank_name ? <><span aria-hidden>·</span><span className="truncate">{question.bank_name}</span></> : null}
        {invalidType ? <span className="font-medium text-destructive">Quiz không nhận câu lập trình</span> : null}
      </p>
    </div>
    <div className="col-start-2 flex flex-wrap items-start gap-1 sm:col-start-3 sm:row-start-1">
      <div className="space-y-1">
        <label htmlFor={pointsId} className="sr-only">Điểm câu {index + 1}</label>
        <div className="relative">
          <Input id={pointsId} type="number" inputMode="decimal" min={0.01} step={0.25} value={question.points} disabled={locked}
            aria-invalid={error ? true : undefined} aria-describedby={error ? `${pointsId}-error` : undefined}
            className="h-9 w-24 pr-8 text-right tabular-nums" onChange={(event) => onPoints(event.target.value)} />
          <span aria-hidden className="pointer-events-none absolute inset-y-0 right-2.5 grid place-items-center text-xs text-muted-foreground">đ</span>
        </div>
        {error ? <p id={`${pointsId}-error`} className="max-w-24 text-xs text-destructive">{error}</p> : null}
      </div>
      <Button type="button" variant="ghost" size="icon-sm" aria-label={`Xem trước câu ${index + 1}`} onClick={onPreview}><Eye aria-hidden /></Button>
      {locked ? null : <>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Đưa câu ${index + 1} lên`} disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp aria-hidden /></Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Đưa câu ${index + 1} xuống`} disabled={index === count - 1} onClick={() => onMove(1)}><ArrowDown aria-hidden /></Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Bỏ câu ${index + 1} khỏi đề`} className="hover:bg-destructive/10 hover:text-destructive" onClick={onRemove}><X aria-hidden /></Button>
      </>}
    </div>
  </li>;
}
