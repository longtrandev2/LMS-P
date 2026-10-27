import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/form-field-error";
import type { MonitorRow } from "@/types/exams";
import { actionErrorText } from "./action-error";
import { useSessionActions } from "./use-exam-monitor";

const PRESETS = [5, 10, 15];

/** Gia hạn một phiên đang làm: số phút (1–120) + lý do bắt buộc — exam-spec §5.6. */
export function ExtendDialog({ assignmentId, row, onClose }: { assignmentId: number; row: MonitorRow; onClose: () => void }) {
  const { extend } = useSessionActions(assignmentId);
  const [minutes, setMinutes] = useState("10");
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const value = Number(minutes);
  const minutesError = Number.isInteger(value) && value >= 1 && value <= 120 ? null : "Số phút từ 1 đến 120.";
  const reasonError = reason.trim() ? null : "Nhập lý do gia hạn.";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (minutesError || reasonError || row.session_id == null) return;
    try {
      await extend.mutateAsync({ sessionId: row.session_id, minutes: value, reason: reason.trim() });
      toast.success(`Đã gia hạn ${value} phút cho ${row.student_full_name}.`);
      onClose();
    } catch (error) {
      toast.error(actionErrorText(error, "gia hạn"));
    }
  }

  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="sm:max-w-md">
      <form onSubmit={submit} noValidate className="grid gap-4">
        <DialogHeader>
          <DialogTitle>Gia hạn thời gian</DialogTitle>
          <DialogDescription>
            {row.student_full_name} · {row.student_code ?? `ID ${row.student_id}`}{row.paper_code ? ` · Mã đề ${row.paper_code}` : ""}.
            Thời gian cộng thêm được phép vượt giờ đóng bài và được ghi vào nhật ký.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label htmlFor="extend-minutes">Số phút cộng thêm</Label>
          <div className="flex items-center gap-2">
            <Input id="extend-minutes" type="number" inputMode="numeric" min={1} max={120} step={1} className="w-24 tabular-nums"
              value={minutes} onChange={(e) => setMinutes(e.target.value)} aria-invalid={touched && minutesError ? true : undefined}
              aria-describedby={touched && minutesError ? "extend-minutes-error" : undefined} />
            {PRESETS.map((preset) => <Button key={preset} type="button" variant="secondary" size="sm"
              className="tabular-nums aria-pressed:bg-foreground aria-pressed:text-background aria-pressed:hover:bg-foreground/90"
              aria-pressed={value === preset} onClick={() => setMinutes(String(preset))}>+{preset}</Button>)}
          </div>
          {touched && minutesError ? <div id="extend-minutes-error"><FieldError text={minutesError} /></div> : null}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="extend-reason">Lý do</Label>
          <Textarea id="extend-reason" rows={3} maxLength={255} placeholder="Ví dụ: máy sinh viên gặp sự cố, mất 10 phút khởi động lại"
            value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={touched && reasonError ? true : undefined}
            aria-describedby={touched && reasonError ? "extend-reason-error" : undefined} />
          {touched && reasonError ? <div id="extend-reason-error"><FieldError text={reasonError} /></div> : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>Hủy</Button>
          <Button type="submit" disabled={extend.isPending}>
            {extend.isPending ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden /> : null}Gia hạn
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
