import { MarkdownView } from "@/components/markdown-view";
import { cn } from "@/lib/utils";
import { CorrectnessMark, markTone, type AnswerFieldProps } from "./correctness-mark";

/** `mcq` (radio thẻ), `multiple_choice` (checkbox thẻ), `true_false` (2 nút lớn). */
export function ChoiceAnswer({ question, value, onChange, readOnly, correct, idPrefix }: AnswerFieldProps) {
  const multiple = question.type === "multiple_choice";
  const trueFalse = question.type === "true_false";
  const selected = value.selected ?? [];
  const correctIds = correct?.option_ids;

  function choose(optionId: number, checked: boolean) {
    if (readOnly) return;
    const next = multiple
      ? checked ? [...selected.filter((id) => id !== optionId), optionId] : selected.filter((id) => id !== optionId)
      : [optionId];
    onChange({ ...value, selected: next });
  }

  return <fieldset className="space-y-2">
    <legend className={multiple ? "mb-2 text-xs font-medium text-muted-foreground" : "sr-only"}>
      {multiple ? "Chọn tất cả đáp án đúng" : trueFalse ? "Chọn Đúng hoặc Sai" : "Chọn một đáp án"}
    </legend>
    <div className={cn("grid gap-2", trueFalse && "grid-cols-2")}>
      {question.options.map((option, index) => {
        const id = `${idPrefix}-option-${option.id}`;
        const checked = selected.includes(option.id);
        const isCorrect = correctIds?.includes(option.id) ?? false;
        const state = correctIds ? (isCorrect ? "correct" : checked ? "wrong" : null) : null;
        return <label key={option.id} htmlFor={id} className={cn(
          "group flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-3 text-sm transition-colors",
          "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40",
          !readOnly && "hover:bg-muted/60",
          checked && !state && "border-primary bg-primary/5",
          trueFalse && "min-h-14 items-center justify-center text-base font-semibold",
          readOnly && "cursor-default",
          markTone(state))}>
          <input id={id} type={multiple ? "checkbox" : "radio"} name={`${idPrefix}-choice`} checked={checked}
            disabled={readOnly} onChange={(event) => choose(option.id, event.target.checked)}
            className={cn("mt-0.5 size-4 shrink-0 accent-[var(--primary)] disabled:opacity-100", trueFalse && "mt-0")} />
          {trueFalse ? <span>{option.content}</span> : <span className="flex min-w-0 flex-1 gap-2">
            <span className="font-mono text-xs leading-6 text-muted-foreground" aria-hidden>{String.fromCharCode(65 + index)}.</span>
            <MarkdownView source={option.content} className="min-w-0 flex-1" />
          </span>}
          {state ? <CorrectnessMark ok={state === "correct"}
            label={state === "correct" ? (checked ? "Bạn chọn đúng" : "Đáp án đúng") : "Bạn chọn sai"} /> : null}
        </label>;
      })}
    </div>
  </fieldset>;
}
