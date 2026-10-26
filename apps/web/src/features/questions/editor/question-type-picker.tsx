import { ArrowDownUp, CircleDot, Code2, Hash, Link2, ListChecks, TextCursorInput, ToggleLeft, Type, type LucideIcon } from "lucide-react";
import { QUESTION_TYPES, questionTypeLabel } from "@/lib/question-types";
import { cn } from "@/lib/utils";
import type { QuestionType } from "@/types/api";

export const TYPE_ICON: Record<QuestionType, LucideIcon> = {
  mcq: CircleDot, multiple_choice: ListChecks, true_false: ToggleLeft, short_answer: Type, numeric: Hash,
  fill_blank: TextCursorInput, matching: Link2, ordering: ArrowDownUp, programming: Code2,
};

/** Chọn loại câu bằng thẻ (tạo mới). Khi sửa, loại bị khóa — chỉ hiện nhãn. */
export function QuestionTypePicker({ value, locked, onChange }: { value: QuestionType; locked: boolean; onChange: (type: QuestionType) => void }) {
  if (locked) {
    const Icon = TYPE_ICON[value];
    return <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
      <span className="grid size-9 place-items-center rounded-lg bg-muted text-foreground"><Icon className="size-4" aria-hidden /></span>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{questionTypeLabel(value)}</p>
        <p className="text-xs text-muted-foreground">Loại câu không đổi được sau khi tạo.</p>
      </div>
    </div>;
  }
  return <fieldset className="space-y-2">
    <legend className="mb-2 text-sm font-semibold">Loại câu hỏi</legend>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {QUESTION_TYPES.map((item) => {
        const Icon = TYPE_ICON[item.id];
        const active = item.id === value;
        return <button key={item.id} type="button" aria-pressed={active} onClick={() => onChange(item.id)}
          className={cn("group flex min-w-0 items-start gap-2.5 rounded-lg border bg-card p-3 text-left transition-colors outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring/40",
            active ? "border-primary ring-1 ring-primary" : "hover:border-foreground/25 hover:bg-muted/40")}>
          <Icon className={cn("mt-0.5 size-4 shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} aria-hidden />
          <span className="min-w-0">
            <span className="block text-sm font-medium leading-5">{item.label}</span>
            <span className="mt-0.5 hidden text-xs leading-4 text-muted-foreground sm:block">{item.description}</span>
          </span>
        </button>;
      })}
    </div>
  </fieldset>;
}
