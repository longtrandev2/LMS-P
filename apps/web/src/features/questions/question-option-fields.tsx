import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { QuestionOption } from "@/types/api";

export function QuestionOptionFields({ rows, onChange }: { rows: QuestionOption[]; onChange: (rows: QuestionOption[]) => void }) {
  function update(index: number, patch: Partial<QuestionOption>) {
    onChange(rows.map((row, i) => i === index ? { ...row, ...patch } : row));
  }
  return (
    <fieldset className="space-y-3 rounded-xl border p-4">
      <legend className="px-1 text-sm font-semibold">Các lựa chọn</legend>
      {rows.map((row, index) => (
        <div key={index} className="flex items-center gap-2">
          <input type="radio" name="correct-option" checked={row.is_correct} onChange={() => onChange(rows.map((item, i) => ({ ...item, is_correct: i === index })))} aria-label={`Đánh dấu lựa chọn ${index + 1} là đáp án đúng`} />
          <Label className="sr-only" htmlFor={`option-${index}`}>Lựa chọn {index + 1}</Label>
          <Input id={`option-${index}`} value={row.content} onChange={(event) => update(index, { content: event.target.value })} placeholder={`Lựa chọn ${index + 1}`} />
          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Xóa lựa chọn ${index + 1}`} onClick={() => onChange(rows.filter((_, i) => i !== index))}><Trash2 aria-hidden /></Button>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">Chọn nút tròn bên cạnh đáp án đúng. Cần ít nhất 2 lựa chọn.</p>
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...rows, { content: "", is_correct: false, position: rows.length + 1 }])}><Plus aria-hidden /> Thêm lựa chọn</Button>
    </fieldset>
  );
}
