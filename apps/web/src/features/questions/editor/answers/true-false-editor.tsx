import { Check, X } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { EditorSection, FieldMessage, useEditor } from "../editor-context";

/** Đúng / Sai: hai thẻ radio (chọn bằng phím mũi tên); server luôn lưu thứ tự “Đúng”, “Sai” (§1.2). */
export function TrueFalseEditor() {
  const { draft, patch, errors } = useEditor();
  const choices = [
    { value: "true", label: "Đúng", icon: Check },
    { value: "false", label: "Sai", icon: X },
  ];
  const value = draft.true_false == null ? "" : String(draft.true_false);
  return <EditorSection field="true_false" title="Đáp án" description="Nhận định trong nội dung là đúng hay sai?">
    <RadioGroup aria-label="Đáp án đúng" value={value} onValueChange={(next) => patch({ true_false: next === "true" })} className="grid-cols-2 gap-3">
      {choices.map(({ value: id, label, icon: Icon }) => <label key={id} htmlFor={`true-false-${id}`}
        className="flex h-16 cursor-pointer items-center gap-3 rounded-lg border px-4 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted/40 hover:text-foreground has-[[data-state=checked]]:border-success/40 has-[[data-state=checked]]:bg-success/5 has-[[data-state=checked]]:text-success">
        <RadioGroupItem id={`true-false-${id}`} value={id} />
        <Icon className="size-4" aria-hidden />{label}
      </label>)}
    </RadioGroup>
    <FieldMessage id="true-false-message" error={errors.true_false} />
  </EditorSection>;
}
