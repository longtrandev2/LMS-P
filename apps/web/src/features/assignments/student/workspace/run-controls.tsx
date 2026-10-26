import { Loader2, Play, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Thanh hành động: chạy thử (test mẫu hoặc input tự nhập) và nộp bài. */
export function RunControls({ useCustom, onUseCustomChange, customInput, onCustomInputChange, onRun, running, hasSamples, canRun, onSubmit, submitting, canSubmit, note }: {
  useCustom: boolean; onUseCustomChange: (value: boolean) => void; customInput: string; onCustomInputChange: (value: string) => void;
  onRun: () => void; running: boolean; hasSamples: boolean; canRun: boolean; onSubmit: () => void; submitting: boolean; canSubmit: boolean; note: string;
}) {
  return <div className="space-y-2 rounded-lg border bg-card p-3">
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <Button type="button" variant="outline" size="sm" onClick={onRun} disabled={!canRun || running}>
        {running ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Play aria-hidden />}
        {running ? "Đang chạy…" : "Chạy thử"}
      </Button>
      <label className="flex cursor-pointer items-center gap-2 text-xs font-medium select-none">
        <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={useCustom} onChange={(event) => onUseCustomChange(event.target.checked)} />
        Input tự nhập
      </label>
      <span className="ml-auto text-xs text-muted-foreground">{note}</span>
      <Button type="button" variant="cta" size="sm" onClick={onSubmit} disabled={!canSubmit || submitting}>
        {submitting ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Send aria-hidden />}
        {submitting ? "Đang nộp…" : "Nộp bài"}
      </Button>
    </div>
    {useCustom ? <div className="space-y-1.5">
      <Label htmlFor="workspace-custom-input" className="text-xs">Input cho lần chạy thử</Label>
      <Textarea id="workspace-custom-input" value={customInput} onChange={(event) => onCustomInputChange(event.target.value)}
        spellCheck={false} className="max-h-48 min-h-20 resize-y font-mono text-xs" placeholder="Dữ liệu đưa vào stdin" />
    </div> : <p className="text-xs text-muted-foreground">
      {hasSamples ? "Chạy thử dùng các ví dụ mẫu, không tính lượt và điểm." : "Đề không có ví dụ mẫu — bật “Input tự nhập” để chạy thử."}
    </p>}
  </div>;
}
