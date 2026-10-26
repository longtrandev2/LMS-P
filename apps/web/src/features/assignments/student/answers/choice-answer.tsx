import { MarkdownView } from "@/components/markdown-view";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { CorrectnessMark, markTone, type AnswerFieldProps } from "./correctness-mark";

const controlClass = "mt-0.5 disabled:cursor-default disabled:opacity-100";

/** `mcq` (radio thẻ), `multiple_choice` (checkbox thẻ), `true_false` (2 thẻ lớn) — dựng trên `ui/radio-group`, `ui/checkbox`. */
export function ChoiceAnswer({ question, value, onChange, readOnly, correct, idPrefix }: AnswerFieldProps) {
  const multiple = question.type === "multiple_choice";
  const trueFalse = question.type === "true_false";
  const selected = value.selected ?? [];
  const correctIds = correct?.option_ids;
  const legend = multiple ? "Chọn tất cả đáp án đúng" : trueFalse ? "Chọn Đúng hoặc Sai" : "Chọn một đáp án";

  function choose(optionId: number, checked: boolean) {
    if (readOnly) return;
    const next = multiple
      ? checked ? [...selected.filter((id) => id !== optionId), optionId] : selected.filter((id) => id !== optionId)
      : [optionId];
    onChange({ ...value, selected: next });
  }

  const cards = question.options.map((option, index) => {
    const id = `${idPrefix}-option-${option.id}`;
    const checked = selected.includes(option.id);
    const isCorrect = correctIds?.includes(option.id) ?? false;
    const state = correctIds ? (isCorrect ? "correct" : checked ? "wrong" : null) : null;
    return <label key={option.id} htmlFor={id} className={cn(
      "group flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-3 text-sm transition-colors duration-150",
      "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
      !readOnly && "hover:bg-muted/40",
      checked && !state && "border-foreground/40 bg-accent",
      trueFalse && "min-h-14 items-center justify-center text-base font-semibold",
      readOnly && "cursor-default",
      markTone(state))}>
      {multiple
        ? <Checkbox id={id} checked={checked} disabled={readOnly} className={controlClass}
          onCheckedChange={(next) => choose(option.id, next === true)} />
        : <RadioGroupItem id={id} value={String(option.id)} disabled={readOnly} className={cn(controlClass, trueFalse && "mt-0")} />}
      {trueFalse ? <span>{option.content}</span> : <span className="flex min-w-0 flex-1 gap-2">
        <span className="font-mono text-xs leading-6 text-muted-foreground" aria-hidden>{String.fromCharCode(65 + index)}.</span>
        <MarkdownView source={option.content} className="min-w-0 flex-1" />
      </span>}
      {state ? <CorrectnessMark ok={state === "correct"}
        label={state === "correct" ? (checked ? "Bạn chọn đúng" : "Đáp án đúng") : "Bạn chọn sai"} /> : null}
    </label>;
  });

  const grid = cn("grid gap-2", trueFalse && "grid-cols-2");
  return <fieldset className="space-y-2">
    <legend className={multiple ? "mb-2 text-xs font-medium text-muted-foreground" : "sr-only"}>{legend}</legend>
    {multiple ? <div className={grid}>{cards}</div>
      // `vertical`: chỉ ↑/↓ đổi lựa chọn; ←/→ để trang quiz chuyển câu (use-page-guards).
      : <RadioGroup aria-label={legend} orientation="vertical" value={selected[0] != null ? String(selected[0]) : ""} disabled={readOnly}
        onValueChange={(next) => choose(Number(next), true)} className={grid}>{cards}</RadioGroup>}
  </fieldset>;
}
