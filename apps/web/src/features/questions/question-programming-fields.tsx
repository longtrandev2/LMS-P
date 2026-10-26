import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { QuestionProgramming } from "@/types/api";

export function QuestionProgrammingFields({ value, onChange }: { value: QuestionProgramming; onChange: (value: QuestionProgramming) => void }) {
  const set = (patch: Partial<QuestionProgramming>) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-4 rounded-xl border p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="question-languages">Ngôn ngữ cho phép</Label>
          <Input id="question-languages" value={value.allowed_languages?.join(", ") ?? ""} onChange={(event) => set({ allowed_languages: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) as QuestionProgramming["allowed_languages"] })} placeholder="python, cpp, java, c" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label htmlFor="question-time">Thời gian (ms)</Label><Input id="question-time" type="number" min={100} max={30000} value={value.time_limit_ms} onChange={(event) => set({ time_limit_ms: Number(event.target.value) })} /></div>
          <div className="space-y-2"><Label htmlFor="question-memory">Bộ nhớ (MB)</Label><Input id="question-memory" type="number" min={32} max={2048} value={value.memory_limit_mb} onChange={(event) => set({ memory_limit_mb: Number(event.target.value) })} /></div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Bỏ trống ngôn ngữ để cho phép tất cả ngôn ngữ được hệ thống hỗ trợ.</p>
      <div className="space-y-2"><Label htmlFor="question-starter">Mã khởi đầu</Label><Textarea id="question-starter" value={value.starter_code ?? ""} onChange={(event) => set({ starter_code: event.target.value })} rows={5} className="font-mono text-xs" placeholder="Mã mẫu cho sinh viên" /></div>
      <div className="space-y-2"><Label htmlFor="question-solution">Lời giải mẫu <span className="text-muted-foreground">(chỉ giảng viên xem được)</span></Label><Textarea id="question-solution" value={value.solution_code ?? ""} onChange={(event) => set({ solution_code: event.target.value })} rows={6} className="font-mono text-xs" placeholder="Lời giải dùng để kiểm tra đề" /></div>
    </div>
  );
}
