import { MarkdownView } from "@/components/markdown-view";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { BAR, CorrectnessMark, markTone, type AnswerFieldProps } from "./correctness-mark";

const controlClass = "mt-1.5 disabled:cursor-default disabled:opacity-100";

/**
 * `mcq` (radio), `multiple_choice` (checkbox), `true_false` (2 thanh cạnh nhau) — mỗi lựa chọn là một thanh xám
 * kiểu quiz Frappe: hover `bg-accent`, đã chọn `bg-accent` + viền 1px foreground; màn xem lại tô xanh/đỏ nhạt.
 */
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

  const bars = question.options.map((option) => {
    const id = `${idPrefix}-option-${option.id}`;
    const checked = selected.includes(option.id);
    const isCorrect = correctIds?.includes(option.id) ?? false;
    const state = correctIds ? (isCorrect ? "correct" : checked ? "wrong" : null) : null;
    return <label key={option.id} htmlFor={id} className={cn(BAR,
      "flex cursor-pointer items-start gap-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
      !readOnly && "hover:bg-accent",
      checked && !state && "border-foreground bg-accent",
      checked && state && "font-medium",
      readOnly && "cursor-default",
      markTone(state))}>
      {multiple
        ? <Checkbox id={id} checked={checked} disabled={readOnly} className={controlClass}
          onCheckedChange={(next) => choose(option.id, next === true)} />
        : <RadioGroupItem id={id} value={String(option.id)} disabled={readOnly} className={controlClass} />}
      <MarkdownView source={option.content} className="min-w-0 flex-1" />
      {state ? <CorrectnessMark ok={state === "correct"} className="mt-1"
        label={state === "correct" ? (checked ? "Bạn chọn đúng" : "Đáp án đúng") : "Bạn chọn sai"} /> : null}
    </label>;
  });

  const grid = cn("grid gap-3", trueFalse && "sm:grid-cols-2");
  return <fieldset>
    <legend className="sr-only">{legend}</legend>
    {multiple ? <div className={grid}>{bars}</div>
      // `vertical`: chỉ ↑/↓ đổi lựa chọn; ←/→ để trang quiz chuyển câu (use-page-guards).
      : <RadioGroup aria-label={legend} orientation="vertical" value={selected[0] != null ? String(selected[0]) : ""} disabled={readOnly}
        onValueChange={(next) => choose(Number(next), true)} className={grid}>{bars}</RadioGroup>}
  </fieldset>;
}
