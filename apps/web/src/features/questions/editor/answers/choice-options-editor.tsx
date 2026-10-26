import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { EditorSection, FieldMessage, useEditor } from "../editor-context";
import { emptyOption, OPTION_LETTERS, type OptionDraft } from "../question-draft";
import { LIMITS } from "../limits";

/** Lựa chọn cho câu một đáp án (radio) và nhiều đáp án (checkbox), 2–8 lựa chọn A–H. */
export function ChoiceOptionsEditor() {
  const { draft, update, errors } = useEditor();
  const single = draft.type === "mcq";
  const setOptions = (recipe: (options: OptionDraft[]) => OptionDraft[]) => update((d) => ({ ...d, options: recipe(d.options) }));
  const edit = (key: string, patch: Partial<OptionDraft>) => setOptions((rows) => rows.map((row) => row.key === key ? { ...row, ...patch } : row));
  const correctKey = draft.options.find((option) => option.is_correct)?.key ?? "";

  const rows = draft.options.map((option, index) => {
    const letter = OPTION_LETTERS[index];
    const error = errors[`options.${index}`];
    return <li key={option.key} className={cn("flex items-start gap-3 rounded-lg border px-3 py-2 transition-colors",
      option.is_correct && "border-success/40 bg-success/5")}>
      <div className="flex h-10 items-center gap-2.5">
        {single ? <RadioGroupItem value={option.key} id={`option-correct-${option.key}`} aria-label={`Đáp án đúng: ${letter}`} />
          : <Checkbox id={`option-correct-${option.key}`} checked={option.is_correct} aria-label={`Đáp án đúng: ${letter}`}
            onCheckedChange={(checked) => edit(option.key, { is_correct: checked === true })} />}
        <span className="w-4 font-mono text-sm font-semibold text-muted-foreground" aria-hidden>{letter}</span>
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <label htmlFor={`option-${option.key}`} className="sr-only">Lựa chọn {letter}</label>
        <Textarea id={`option-${option.key}`} rows={1} value={option.content} placeholder={`Lựa chọn ${letter}`}
          aria-invalid={!!error} onChange={(event) => edit(option.key, { content: event.target.value })}
          className="min-h-10 border-transparent bg-transparent px-1 shadow-none focus-visible:border-input dark:bg-transparent" />
        {error ? <p className="px-1 text-xs text-destructive">{error}</p> : null}
      </div>
      <Button type="button" variant="ghost" size="icon-sm" className="mt-0.5 text-muted-foreground" aria-label={`Xóa lựa chọn ${letter}`}
        disabled={draft.options.length <= LIMITS.options.min} onClick={() => setOptions((list) => list.filter((row) => row.key !== option.key))}>
        <X aria-hidden />
      </Button>
    </li>;
  });

  return <EditorSection field="options" title="Các lựa chọn"
    description={single ? "Chọn nút tròn ở lựa chọn đúng. Cần 2–8 lựa chọn." : "Đánh dấu tất cả lựa chọn đúng (ít nhất một). Cần 2–8 lựa chọn."}>
    {single ? <RadioGroup value={correctKey} aria-label="Đáp án đúng" asChild
      onValueChange={(key) => setOptions((list) => list.map((row) => ({ ...row, is_correct: row.key === key })))}>
      <ol>{rows}</ol>
    </RadioGroup> : <ol className="space-y-2">{rows}</ol>}
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Button type="button" variant="outline" size="sm" disabled={draft.options.length >= LIMITS.options.max}
        onClick={() => setOptions((list) => [...list, emptyOption()])}><Plus aria-hidden /> Thêm lựa chọn</Button>
      <span className="text-xs text-muted-foreground tabular-nums">{draft.options.length}/{LIMITS.options.max}</span>
    </div>
    <FieldMessage id="options-message" error={errors.options} />
  </EditorSection>;
}
