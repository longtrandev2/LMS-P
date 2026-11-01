import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import { periodRange } from "@/lib/schedule";
import type { ClassSession, ClassSummary } from "@/types/api";
import { usePublicSettings } from "@/lib/use-public-settings";
import { EVIDENCE_DEFAULT_MAX_MB, EvidencePicker, validateEvidence } from "./evidence-picker";
import { periodLabel, shortDate, weekdayOf } from "./schedule-format";
import { useCreateLeaveRequest } from "./use-student-schedule";

const REASON_MAX = 1000;

function conflictText(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) {
    if (error.code === "DEADLINE_PASSED") return "Buổi học đã qua quá 7 ngày nên không thể gửi đơn xin nghỉ.";
    return "Buổi học này đã có đơn xin nghỉ đang chờ duyệt hoặc đã được duyệt.";
  }
  return errorText(error);
}

/** Dialog "Đăng ký xin nghỉ" cho một buổi — lý do bắt buộc + một tệp minh chứng (spec §4). */
export function LeaveRequestDialog({ classId, clazz, session, onOpenChange }: {
  classId: string;
  clazz?: ClassSummary;
  session: ClassSession;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateLeaveRequest(classId);
  const maxMb = usePublicSettings().data?.leave_evidence_max_mb ?? EVIDENCE_DEFAULT_MAX_MB;
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [touched, setTouched] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const reasonError = touched && !reason.trim() ? "Vui lòng nhập lý do xin nghỉ." : null;

  function pick(next: File | null) {
    setServerError(null);
    if (next) {
      const problem = validateEvidence(next, maxMb);
      setFileError(problem);
      setFile(problem ? null : next);
    } else { setFile(null); setFileError(null); }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!reason.trim()) return;
    if (!file) { setFileError("Vui lòng chọn tệp minh chứng."); return; }
    const problem = validateEvidence(file, maxMb);
    if (problem) { setFileError(problem); return; }
    setServerError(null);
    try {
      await create.mutateAsync({ sessionId: session.id, reason: reason.trim(), evidence: file });
      toast.success("Đã gửi đơn xin nghỉ. Vui lòng chờ giảng viên phê duyệt.");
      onOpenChange(false);
    } catch (error) {
      setServerError(conflictText(error));
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!create.isPending) onOpenChange(open); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Đăng ký xin nghỉ</DialogTitle>
          <DialogDescription>Gửi đơn kèm minh chứng để giảng viên xét duyệt vắng có phép.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <dl className="grid gap-3 rounded-lg bg-secondary px-4 py-3 text-sm sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">Lớp tín chỉ</dt>
              <dd className="mt-0.5 truncate font-medium">{clazz ? `${clazz.code} — ${clazz.course_name}` : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Buổi học</dt>
              <dd className="mt-0.5 font-medium tabular-nums">{weekdayOf(session.date)}, {shortDate(session.date)}</dd>
              <dd className="text-xs text-muted-foreground tabular-nums">
                {periodLabel(session.start_period, session.end_period)} · {periodRange(session.start_period, session.end_period)}
              </dd>
            </div>
          </dl>
          <div className="space-y-1.5">
            <Label htmlFor="leave-reason">Lý do <span className="text-destructive" aria-hidden>*</span></Label>
            <Textarea id="leave-reason" value={reason} maxLength={REASON_MAX} rows={4} required disabled={create.isPending}
              placeholder="Ví dụ: Em bị ốm, có giấy khám bệnh kèm theo."
              aria-invalid={reasonError ? true : undefined} aria-describedby="leave-reason-hint"
              onChange={(event) => setReason(event.target.value)} onBlur={() => setTouched(true)} />
            <p id="leave-reason-hint" className="flex justify-between gap-3 text-xs">
              <span className="text-destructive">{reasonError}</span>
              <span className="text-muted-foreground tabular-nums">{reason.length}/{REASON_MAX}</span>
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="leave-evidence">Minh chứng <span className="text-destructive" aria-hidden>*</span></Label>
            <EvidencePicker id="leave-evidence" file={file} error={fileError} onChange={pick} disabled={create.isPending} maxMb={maxMb} />
          </div>
          {serverError ? <p role="alert" className="rounded-md bg-destructive/8 px-3 py-2 text-sm text-destructive">{serverError}</p> : null}
          <p className="text-[13px] text-destructive">Sau khi gửi đơn, vui lòng chờ phê duyệt trước khi nghỉ học.</p>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="secondary" disabled={create.isPending}>Hủy</Button></DialogClose>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null} Gửi đơn
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
