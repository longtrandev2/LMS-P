import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { EditorSection, FieldMessage, useEditor } from "../editor-context";

/** Đúng / Sai: hai thanh radio (chọn bằng phím mũi tên); server luôn lưu thứ tự “Đúng”, “Sai” (§1.2). */
export function TrueFalseEditor() {
  const { draft, patch, errors } = useEditor();
  const value = draft.true_false == null ? "" : String(draft.true_false);
  return <EditorSection field="true_false" title="Đáp án" description="Nhận định trong nội dung là đúng hay sai?">
    <RadioGroup aria-label="Đáp án đúng" value={value} onValueChange={(next) => patch({ true_false: next === "true" })} className="grid-cols-2 gap-2 sm:max-w-md">
      {[{ id: "true", label: "Đúng" }, { id: "false", label: "Sai" }].map(({ id, label }) => <label key={id} htmlFor={`true-false-${id}`}
        className="flex h-11 cursor-pointer items-center gap-3 rounded-lg bg-secondary px-4 text-sm transition-colors duration-150 hover:bg-accent has-[[data-state=checked]]:bg-success/10 has-[[data-state=checked]]:font-medium has-[[data-state=checked]]:text-success">
        <RadioGroupItem id={`true-false-${id}`} value={id} className="border-foreground/30" />{label}
      </label>)}
    </RadioGroup>
    <FieldMessage id="true-false-message" error={errors.true_false} />
  </EditorSection>;
}
