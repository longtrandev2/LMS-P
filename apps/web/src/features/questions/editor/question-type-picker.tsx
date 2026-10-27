import { QUESTION_TYPES } from "@/lib/question-types";
import { cn } from "@/lib/utils";
import type { QuestionType } from "@/types/api";
import { TYPE_ICON } from "../question-labels";
import { EditorSection } from "./editor-context";

/** Chọn loại câu khi tạo mới: lưới thẻ gọn kiểu ClassroomIO (icon nét trong ô xám nhạt + tên + mô tả 1 dòng). */
export function QuestionTypePicker({ value, onChange }: { value: QuestionType; onChange: (type: QuestionType) => void }) {
  return <EditorSection title="Loại câu hỏi" description="Chọn cách sinh viên trả lời. Loại câu không đổi được sau khi lưu.">
    <div role="group" aria-label="Loại câu hỏi" className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
      {QUESTION_TYPES.map((item) => {
        const Icon = TYPE_ICON[item.id];
        const active = item.id === value;
        return <button key={item.id} type="button" aria-pressed={active} onClick={() => onChange(item.id)}
          className={cn("flex min-w-0 items-center gap-3 rounded-xl border p-2.5 text-left transition-colors duration-150 outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring",
            active ? "border-foreground bg-background ring-1 ring-foreground" : "hover:bg-secondary/60")}>
          <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", active ? "bg-foreground text-background" : "bg-secondary text-foreground")}>
            <Icon className="size-4" strokeWidth={1.75} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-sm leading-5 font-medium">{item.label}</span>
            <span className="block truncate text-xs leading-4 text-muted-foreground">{item.description}</span>
          </span>
        </button>;
      })}
    </div>
  </EditorSection>;
}
