import { ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditorSection, FieldMessage, useEditor } from "../editor-context";
import { blankCount, emptyBlank, type BlankDraft, type QuestionDraft } from "../question-draft";
import { AcceptedAnswersInput } from "./accepted-answers-input";

/** Chèn `[[n]]` (n = số lớn nhất + 1) tại vị trí con trỏ. Trả nội dung mới và vị trí con trỏ sau ô. */
export function insertBlankAt(content: string, start: number, end: number): { content: string; caret: number } {
  const marker = `[[${blankCount(content) + 1}]]`;
  return { content: content.slice(0, start) + marker + content.slice(end), caret: start + marker.length };
}

/** Đánh số lại các ô theo thứ tự xuất hiện; đáp án đi theo ô cũ, ô trùng số nhận đáp án trống. */
export function renumberBlanks(draft: QuestionDraft): QuestionDraft {
  const used = new Set<number>();
  const blanks: BlankDraft[] = [];
  const content = draft.content.replace(/\[\[(\d{1,2})\]\]/g, (_, raw: string) => {
    const old = Number(raw);
    blanks.push(!used.has(old) && draft.blanks[old - 1] ? draft.blanks[old - 1] : emptyBlank());
    used.add(old);
    return `[[${blanks.length}]]`;
  });
  return { ...draft, content, blanks };
}

/** Đáp án từng ô — danh sách ô tự đồng bộ với các `[[n]]` trong nội dung. */
export function FillBlankEditor() {
  const { draft, update, errors } = useEditor();
  const count = blankCount(draft.content);
  const setBlank = (index: number, patch: Partial<BlankDraft>) => update((d) => {
    const blanks = [...d.blanks];
    while (blanks.length <= index) blanks.push(emptyBlank());
    blanks[index] = { ...blanks[index], ...patch };
    return { ...d, blanks };
  });
  return <EditorSection field="blanks" title="Đáp án các ô"
    description="Mỗi ô [[n]] trong nội dung có một danh sách đáp án chấp nhận. Danh sách tự cập nhật theo nội dung."
    actions={errors.blanks && count ? <Button type="button" size="sm" variant="outline" onClick={() => update(renumberBlanks)}>
      <ListOrdered aria-hidden /> Đánh số lại</Button> : null}>
    {count === 0 ? <p className="rounded-lg bg-secondary/60 px-4 py-6 text-center text-sm text-muted-foreground">
      Nội dung chưa có ô nào. Đặt con trỏ vào chỗ cần điền rồi bấm “Chèn ô”.</p> : <ol className="space-y-5">
      {Array.from({ length: count }, (_, index) => {
        const blank = draft.blanks[index];
        return <li key={index} data-field={`blanks.${index}`}>
          <AcceptedAnswersInput id={`blank-${index + 1}`} label={`Ô [[${index + 1}]]`} values={blank?.accepted ?? []}
            caseSensitive={blank?.case_sensitive ?? false} error={errors[`blanks.${index}`]}
            onChange={(accepted) => setBlank(index, { accepted })}
            onCaseSensitiveChange={(case_sensitive) => setBlank(index, { case_sensitive })} />
        </li>;
      })}
    </ol>}
    <FieldMessage id="blanks-message" error={errors.blanks} />
  </EditorSection>;
}
