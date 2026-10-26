import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { questionTypeLabel } from "@/lib/question-types";
import { cn } from "@/lib/utils";
import { Checkbox } from "./controls";
import { DIFFICULTY_LABEL, plainExcerpt } from "./labels";
import type { QuestionSummary } from "@/types/api";

/** Một hàng câu hỏi trong panel chọn/bốc câu. */
export function QuestionPickRow({ item, checked, disabledReason, onCheckedChange, onPreview }: {
  item: QuestionSummary; checked: boolean; disabledReason?: string;
  onCheckedChange: (checked: boolean) => void; onPreview: () => void;
}) {
  const id = `pick-question-${item.id}`;
  const disabled = !!disabledReason;
  return <li className={cn("flex items-start gap-3 px-4 py-3 transition-colors", !disabled && "hover:bg-muted/40", checked && !disabled && "bg-primary/5")}>
    <Checkbox id={id} className="mt-1" checked={checked} disabled={disabled} onCheckedChange={(value) => onCheckedChange(value === true)}
      aria-describedby={disabledReason ? `${id}-reason` : undefined} />
    <label htmlFor={id} className={cn("min-w-0 flex-1 space-y-1", disabled ? "cursor-not-allowed" : "cursor-pointer")}>
      <span className="line-clamp-2 block text-sm leading-6">{plainExcerpt(item.content, 220) || `Câu hỏi #${item.id}`}</span>
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span className="font-medium text-foreground/80">{questionTypeLabel(item.type)}</span>
        <span aria-hidden>·</span><span>{DIFFICULTY_LABEL[item.difficulty]}</span>
        <span aria-hidden>·</span><span className="truncate">{item.category_name}</span>
        {disabledReason ? <span id={`${id}-reason`} className="rounded-md bg-muted px-1.5 py-0.5 font-medium">{disabledReason}</span> : null}
      </span>
    </label>
    <Button type="button" variant="ghost" size="icon-sm" aria-label={`Xem trước câu ${item.id}`} onClick={onPreview}><Eye aria-hidden /></Button>
  </li>;
}
