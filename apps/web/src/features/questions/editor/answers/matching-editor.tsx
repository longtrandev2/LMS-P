import { ArrowRight, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EditorSection, FieldMessage, useEditor } from "../editor-context";
import { emptyItem, emptyPair, type ItemDraft, type PairDraft } from "../question-draft";
import { LIMITS } from "../limits";

const cellClass = "min-h-10 bg-background";

function CellError({ text }: { text?: string }) {
  return text ? <p className="mt-1 text-xs text-destructive">{text}</p> : null;
}

/** Ghép cặp: 2–12 cặp trái–phải + 0–6 đáp án nhiễu ở cột phải. ID server được giữ nguyên. */
export function MatchingEditor() {
  const { draft, update, errors } = useEditor();
  const setPairs = (recipe: (rows: PairDraft[]) => PairDraft[]) => update((d) => ({ ...d, pairs: recipe(d.pairs) }));
  const setDistractors = (recipe: (rows: ItemDraft[]) => ItemDraft[]) => update((d) => ({ ...d, distractors: recipe(d.distractors) }));
  const editPair = (key: string, patch: Partial<PairDraft>) => setPairs((rows) => rows.map((row) => row.key === key ? { ...row, ...patch } : row));

  return <EditorSection field="pairs" title="Các cặp ghép" description="Mỗi dòng là một cặp đúng. Cột phải luôn được trộn khi sinh viên làm bài.">
    <div className="hidden grid-cols-[1fr_16px_1fr_36px] gap-2 px-1 text-xs font-medium text-muted-foreground sm:grid">
      <span>Bên trái</span><span /><span>Bên phải (đáp án đúng)</span><span />
    </div>
    <ol className="space-y-2">
      {draft.pairs.map((pair, index) => <li key={pair.key} className="grid grid-cols-[1fr_36px] gap-2 rounded-lg border p-2 sm:grid-cols-[1fr_16px_1fr_36px] sm:items-start sm:border-0 sm:p-0">
        <div data-field={`pairs.${index}.left`}>
          <label htmlFor={`pair-left-${pair.key}`} className="sr-only">Cặp {index + 1}, bên trái</label>
          <Textarea id={`pair-left-${pair.key}`} rows={1} value={pair.left} placeholder={`Mục ${index + 1}`} className={cellClass}
            aria-invalid={!!errors[`pairs.${index}.left`]} onChange={(event) => editPair(pair.key, { left: event.target.value })} />
          <CellError text={errors[`pairs.${index}.left`]} />
        </div>
        <ArrowRight className="mt-3 hidden size-4 text-muted-foreground sm:block" aria-hidden />
        <div data-field={`pairs.${index}.right`} className="col-start-1 sm:col-start-auto">
          <label htmlFor={`pair-right-${pair.key}`} className="sr-only">Cặp {index + 1}, bên phải</label>
          <Textarea id={`pair-right-${pair.key}`} rows={1} value={pair.right} placeholder="Ghép với…" className={cellClass}
            aria-invalid={!!errors[`pairs.${index}.right`]} onChange={(event) => editPair(pair.key, { right: event.target.value })} />
          <CellError text={errors[`pairs.${index}.right`]} />
        </div>
        <Button type="button" variant="ghost" size="icon-sm" className="col-start-2 row-start-1 text-muted-foreground sm:col-start-auto sm:row-start-auto"
          aria-label={`Xóa cặp ${index + 1}`} disabled={draft.pairs.length <= LIMITS.pairs.min}
          onClick={() => setPairs((rows) => rows.filter((row) => row.key !== pair.key))}><X aria-hidden /></Button>
      </li>)}
    </ol>
    <div className="flex items-center justify-between gap-2">
      <Button type="button" variant="outline" size="sm" disabled={draft.pairs.length >= LIMITS.pairs.max}
        onClick={() => setPairs((rows) => [...rows, emptyPair()])}><Plus aria-hidden /> Thêm cặp</Button>
      <span className="text-xs text-muted-foreground">{draft.pairs.length}/{LIMITS.pairs.max} cặp</span>
    </div>
    <FieldMessage id="pairs-message" error={errors.pairs} />

    <div className="space-y-2 border-t pt-4" data-field="distractors">
      <div>
        <p className="text-sm font-medium">Đáp án nhiễu <span className="font-normal text-muted-foreground">(tùy chọn)</span></p>
        <p className="text-xs text-muted-foreground">Thêm vào cột phải nhưng không ghép với mục nào. Không trùng với các mục bên phải.</p>
      </div>
      {draft.distractors.map((item, index) => <div key={item.key} data-field={`distractors.${index}`} className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor={`distractor-${item.key}`} className="sr-only">Đáp án nhiễu {index + 1}</label>
          <Textarea id={`distractor-${item.key}`} rows={1} value={item.text} className={cellClass} aria-invalid={!!errors[`distractors.${index}`]}
            onChange={(event) => setDistractors((rows) => rows.map((row) => row.key === item.key ? { ...row, text: event.target.value } : row))} />
          <CellError text={errors[`distractors.${index}`]} />
        </div>
        <Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label={`Xóa đáp án nhiễu ${index + 1}`}
          onClick={() => setDistractors((rows) => rows.filter((row) => row.key !== item.key))}><X aria-hidden /></Button>
      </div>)}
      <Button type="button" variant="ghost" size="sm" disabled={draft.distractors.length >= LIMITS.distractors}
        onClick={() => setDistractors((rows) => [...rows, emptyItem()])}><Plus aria-hidden /> Thêm đáp án nhiễu</Button>
      <FieldMessage id="distractors-message" error={errors.distractors} />
    </div>
  </EditorSection>;
}
