import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { EditorSection, FieldMessage, useEditor } from "../editor-context";

/** Đúng / Sai: hai nút lớn; server luôn lưu thứ tự “Đúng”, “Sai” (§1.2). */
export function TrueFalseEditor() {
  const { draft, patch, errors } = useEditor();
  const choices = [
    { value: true, label: "Đúng", icon: Check },
    { value: false, label: "Sai", icon: X },
  ];
  return <EditorSection field="true_false" title="Đáp án" description="Nhận định trong nội dung là đúng hay sai?">
    <div role="radiogroup" aria-label="Đáp án đúng" className="grid grid-cols-2 gap-3">
      {choices.map(({ value, label, icon: Icon }) => {
        const active = draft.true_false === value;
        return <button key={label} type="button" role="radio" aria-checked={active} onClick={() => patch({ true_false: value })}
          className={cn("flex h-20 flex-col items-center justify-center gap-1.5 rounded-xl border text-base font-semibold transition-colors outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring/40",
            active ? "border-success bg-success/10 text-success" : "bg-background text-muted-foreground hover:border-foreground/25 hover:text-foreground")}>
          <Icon className="size-5" aria-hidden />{label}
        </button>;
      })}
    </div>
    <FieldMessage id="true-false-message" error={errors.true_false} />
  </EditorSection>;
}
