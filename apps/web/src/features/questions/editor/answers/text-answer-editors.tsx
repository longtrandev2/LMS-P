import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EditorSection, FieldMessage, useEditor } from "../editor-context";
import { AcceptedAnswersInput } from "./accepted-answers-input";

/** Trả lời ngắn: danh sách đáp án chấp nhận (1–20). */
export function ShortAnswerEditor() {
  const { draft, patch, errors } = useEditor();
  return <EditorSection field="accepted" title="Đáp án chấp nhận" description="Câu trả lời khớp một trong các đáp án dưới đây là đúng.">
    <AcceptedAnswersInput id="short-answer-accepted" label="Đáp án" values={draft.accepted} error={errors.accepted}
      onChange={(accepted) => patch({ accepted })} caseSensitive={draft.case_sensitive}
      onCaseSensitiveChange={(case_sensitive) => patch({ case_sensitive })} />
  </EditorSection>;
}

const decimalPattern = /^-?[0-9]*([.,][0-9]*)?([eE][-+]?[0-9]*)?$/;

/** Đáp số: giá trị + sai số cho phép; nhận dấu phẩy thập phân. */
export function NumericEditor() {
  const { draft, update, errors } = useEditor();
  const set = (field: "value" | "tolerance", value: string) => {
    if (decimalPattern.test(value)) update((d) => ({ ...d, numeric: { ...d.numeric, [field]: value } }));
  };
  return <EditorSection field="numeric.value" title="Đáp số" description="Đúng khi |x − đáp số| ≤ sai số. Có thể dùng dấu phẩy thập phân.">
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="numeric-value">Đáp số</Label>
        <Input id="numeric-value" inputMode="decimal" autoComplete="off" value={draft.numeric.value} placeholder="Ví dụ: 3,14"
          aria-invalid={!!errors["numeric.value"]} aria-describedby="numeric-value-message"
          onChange={(event) => set("value", event.target.value)} className="font-mono" />
        <FieldMessage id="numeric-value-message" error={errors["numeric.value"]} />
      </div>
      <div className="space-y-2" data-field="numeric.tolerance">
        <Label htmlFor="numeric-tolerance">Sai số cho phép</Label>
        <Input id="numeric-tolerance" inputMode="decimal" autoComplete="off" value={draft.numeric.tolerance} placeholder="0"
          aria-invalid={!!errors["numeric.tolerance"]} aria-describedby="numeric-tolerance-message"
          onChange={(event) => set("tolerance", event.target.value)} className="font-mono" />
        <FieldMessage id="numeric-tolerance-message" error={errors["numeric.tolerance"]} hint="0 nghĩa là phải khớp chính xác." />
      </div>
    </div>
  </EditorSection>;
}
