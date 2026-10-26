import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EditorSection, FieldMessage, useEditor } from "../editor-context";
import { emptyItem, type ItemDraft } from "../question-draft";
import { LIMITS } from "../limits";
import { moveItem } from "../list-utils";

/** Sắp xếp: danh sách theo đúng thứ tự (2–12 mục), đổi chỗ bằng nút lên/xuống. */
export function OrderingEditor() {
  const { draft, update, errors } = useEditor();
  const setItems = (recipe: (rows: ItemDraft[]) => ItemDraft[]) => update((d) => ({ ...d, items: recipe(d.items) }));
  const count = draft.items.length;
  return <EditorSection field="items" title="Thứ tự đúng" description="Nhập các mục theo đúng thứ tự từ trên xuống. Sinh viên sẽ thấy danh sách đã trộn.">
    <ol className="space-y-2">
      {draft.items.map((item, index) => {
        const error = errors[`items.${index}`];
        return <li key={item.key} data-field={`items.${index}`} className="flex items-start gap-2">
          <span className="grid h-10 w-7 shrink-0 place-items-center font-mono text-sm font-semibold text-muted-foreground" aria-hidden>{index + 1}</span>
          <div className="min-w-0 flex-1">
            <label htmlFor={`order-item-${item.key}`} className="sr-only">Mục thứ {index + 1}</label>
            <Textarea id={`order-item-${item.key}`} rows={1} value={item.text} aria-invalid={!!error} className="min-h-10"
              onChange={(event) => setItems((rows) => rows.map((row) => row.key === item.key ? { ...row, text: event.target.value } : row))} />
            {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
          </div>
          <div className="flex shrink-0 items-center">
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Đưa mục ${index + 1} lên`} disabled={index === 0}
              onClick={() => setItems((rows) => moveItem(rows, index, -1))}><ArrowUp aria-hidden /></Button>
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Đưa mục ${index + 1} xuống`} disabled={index === count - 1}
              onClick={() => setItems((rows) => moveItem(rows, index, 1))}><ArrowDown aria-hidden /></Button>
            <Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label={`Xóa mục ${index + 1}`}
              disabled={count <= LIMITS.items.min} onClick={() => setItems((rows) => rows.filter((row) => row.key !== item.key))}><X aria-hidden /></Button>
          </div>
        </li>;
      })}
    </ol>
    <div className="flex items-center justify-between gap-2">
      <Button type="button" variant="outline" size="sm" disabled={count >= LIMITS.items.max}
        onClick={() => setItems((rows) => [...rows, emptyItem()])}><Plus aria-hidden /> Thêm mục</Button>
      <span className="text-xs text-muted-foreground tabular-nums">{count}/{LIMITS.items.max}</span>
    </div>
    <FieldMessage id="items-message" error={errors.items} />
  </EditorSection>;
}
