import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { EditorSection, FieldMessage, useEditor } from "../editor-context";
import { emptyOption, OPTION_LETTERS, type OptionDraft } from "../question-draft";
import { LIMITS } from "../limits";
import { bareTextarea, rowBar, rowBarCorrect } from "../row-styles";

/** Lựa chọn cho câu một đáp án (radio) và nhiều đáp án (checkbox), 2–8 lựa chọn A–H — mỗi lựa chọn là một thanh xám. */
export function ChoiceOptionsEditor() {
  const { draft, update, errors } = useEditor();
  const single = draft.type === "mcq";
  const setOptions = (recipe: (options: OptionDraft[]) => OptionDraft[]) => update((d) => ({ ...d, options: recipe(d.options) }));
  const edit = (key: string, patch: Partial<OptionDraft>) => setOptions((rows) => rows.map((row) => row.key === key ? { ...row, ...patch } : row));
  const correctKey = draft.options.find((option) => option.is_correct)?.key ?? "";

  const rows = draft.options.map((option, index) => {
    const letter = OPTION_LETTERS[index];
    const error = errors[`options.${index}`];
    return <li key={option.key} className="space-y-1">
      <div className={cn(rowBar, option.is_correct && rowBarCorrect, error && "ring-1 ring-destructive/50")}>
        <div className="flex h-9 items-center gap-3">
          {single ? <RadioGroupItem value={option.key} id={`option-correct-${option.key}`} className="border-foreground/30" aria-label={`Đáp án đúng: ${letter}`} />
            : <Checkbox id={`option-correct-${option.key}`} className="border-foreground/30" checked={option.is_correct} aria-label={`Đáp án đúng: ${letter}`}
              onCheckedChange={(checked) => edit(option.key, { is_correct: checked === true })} />}
          <span className="w-3 font-mono text-xs font-medium text-muted-foreground" aria-hidden>{letter}</span>
        </div>
        <label htmlFor={`option-${option.key}`} className="sr-only">Lựa chọn {letter}</label>
        <Textarea id={`option-${option.key}`} rows={1} value={option.content} placeholder={`Lựa chọn ${letter}`}
          aria-invalid={!!error} onChange={(event) => edit(option.key, { content: event.target.value })} className={cn(bareTextarea, "flex-1")} />
        {option.is_correct ? <span className="flex h-9 shrink-0 items-center text-xs font-medium text-success">Đúng</span> : null}
        <Button type="button" variant="ghost" size="icon-sm" className="mt-1 -mr-1.5 text-muted-foreground opacity-60 group-hover/row:opacity-100 focus-visible:opacity-100"
          aria-label={`Xóa lựa chọn ${letter}`} disabled={draft.options.length <= LIMITS.options.min}
          onClick={() => setOptions((list) => list.filter((row) => row.key !== option.key))}><X aria-hidden /></Button>
      </div>
      {error ? <p className="px-3 text-xs text-destructive">{error}</p> : null}
    </li>;
  });

  return <EditorSection field="options" title="Các lựa chọn"
    description={single ? "Chọn nút tròn ở lựa chọn đúng. Cần 2–8 lựa chọn; thứ tự có thể được trộn khi làm bài." : "Đánh dấu tất cả lựa chọn đúng (ít nhất một). Cần 2–8 lựa chọn."}>
    {single ? <RadioGroup value={correctKey} aria-label="Đáp án đúng" asChild
      onValueChange={(key) => setOptions((list) => list.map((row) => ({ ...row, is_correct: row.key === key })))}>
      <ol className="space-y-2">{rows}</ol>
    </RadioGroup> : <ol className="space-y-2">{rows}</ol>}
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Button type="button" variant="ghost" size="sm" className="-ml-2.5 text-muted-foreground" disabled={draft.options.length >= LIMITS.options.max}
        onClick={() => setOptions((list) => [...list, emptyOption()])}><Plus aria-hidden /> Thêm lựa chọn</Button>
      <span className="text-xs text-muted-foreground tabular-nums">{draft.options.length}/{LIMITS.options.max}</span>
    </div>
    <FieldMessage id="options-message" error={errors.options} />
  </EditorSection>;
}
