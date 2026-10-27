import { Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Thanh hành động dưới editor: nút xám "Chạy thử", "Input tự nhập", số lượt còn lại, nút đen "Nộp bài". */
export function RunControls({ useCustom, onUseCustomChange, customInput, onCustomInputChange, onRun, running, hasSamples, canRun, onSubmit, submitting, canSubmit, note }: {
  useCustom: boolean; onUseCustomChange: (value: boolean) => void; customInput: string; onCustomInputChange: (value: string) => void;
  onRun: () => void; running: boolean; hasSamples: boolean; canRun: boolean; onSubmit: () => void; submitting: boolean; canSubmit: boolean; note: string;
}) {
  return <div className="space-y-3 px-4 pb-4">
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <Button type="button" variant="secondary" onClick={onRun} disabled={!canRun || running}
        title={hasSamples ? "Chạy với ví dụ mẫu, không tính lượt và điểm" : "Bật “Input tự nhập” để chạy thử"}>
        {running ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Play aria-hidden />}
        {running ? "Đang chạy…" : "Chạy thử"}
      </Button>
      <label htmlFor="workspace-use-custom" className="flex cursor-pointer items-center gap-2 text-sm select-none">
        <Checkbox id="workspace-use-custom" checked={useCustom} onCheckedChange={(checked) => onUseCustomChange(checked === true)} />
        Input tự nhập
      </label>
      <span className="ml-auto text-sm text-muted-foreground tabular-nums">{note}</span>
      <Button type="button" onClick={onSubmit} disabled={!canSubmit || submitting}>
        {submitting ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden /> : null}
        {submitting ? "Đang nộp…" : "Nộp bài"}
      </Button>
    </div>
    {useCustom ? <div className="space-y-1.5">
      <Label htmlFor="workspace-custom-input" className="text-xs text-muted-foreground">Input cho lần chạy thử (stdin)</Label>
      <Textarea id="workspace-custom-input" value={customInput} onChange={(event) => onCustomInputChange(event.target.value)}
        spellCheck={false} className="max-h-48 min-h-20 resize-y font-mono text-xs" placeholder="Dữ liệu đưa vào stdin" />
    </div> : hasSamples ? null : <p className="text-xs text-muted-foreground">Đề không có ví dụ mẫu — bật “Input tự nhập” để chạy thử.</p>}
  </div>;
}
