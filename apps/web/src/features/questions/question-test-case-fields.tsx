import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { QuestionTestCase } from "@/types/api";

export function QuestionTestCaseFields({ rows, onChange }: { rows: QuestionTestCase[]; onChange: (rows: QuestionTestCase[]) => void }) {
  function update(index: number, patch: Partial<QuestionTestCase>) {
    onChange(rows.map((row, i) => i === index ? { ...row, ...patch } : row));
  }
  return (
    <fieldset className="space-y-4 rounded-xl border p-4">
      <legend className="px-1 text-sm font-semibold">Bộ test</legend>
      {rows.map((row, index) => (
        <div key={index} className="space-y-3 rounded-lg bg-muted/40 p-3">
          <div className="flex items-center justify-between"><p className="text-sm font-medium">Test {index + 1}</p><Button type="button" variant="ghost" size="icon-sm" aria-label={`Xóa test ${index + 1}`} onClick={() => onChange(rows.filter((_, i) => i !== index))}><Trash2 aria-hidden /></Button></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor={`case-input-${index}`}>Input</Label><Textarea id={`case-input-${index}`} rows={3} className="font-mono text-xs" value={row.input} onChange={(event) => update(index, { input: event.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor={`case-output-${index}`}>Output mong đợi</Label><Textarea id={`case-output-${index}`} rows={3} className="font-mono text-xs" value={row.expected_output} onChange={(event) => update(index, { expected_output: event.target.value })} /></div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={row.is_public} onChange={(event) => update(index, { is_public: event.target.checked })} /> Công khai</label>
            <Label htmlFor={`case-weight-${index}`}>Trọng số</Label><Input id={`case-weight-${index}`} className="w-24" type="number" min="0.01" max="100" step="0.01" value={row.weight} onChange={(event) => update(index, { weight: Number(event.target.value) })} />
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...rows, { input: "", expected_output: "", is_public: true, weight: 1, position: rows.length + 1 }])}><Plus aria-hidden /> Thêm test case</Button>
    </fieldset>
  );
}
