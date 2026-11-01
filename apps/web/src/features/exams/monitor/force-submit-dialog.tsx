import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/form-field-error";
import type { MonitorRow } from "@/types/exams";
import { actionErrorText } from "./action-error";
import { useSessionActions } from "./use-exam-monitor";

/** Thu bài một phiên đang làm: xác nhận + lý do bắt buộc; bài được chấm bằng câu trả lời đã lưu — exam-spec §5.6. */
export function ForceSubmitDialog({ assignmentId, row, onClose }: { assignmentId: number; row: MonitorRow; onClose: () => void }) {
  const { forceSubmit } = useSessionActions(assignmentId);
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const reasonError = reason.trim() ? null : "Nhập lý do thu bài.";

  async function submit() {
    setTouched(true);
    if (reasonError || row.session_id == null) return;
    try {
      await forceSubmit.mutateAsync({ sessionId: row.session_id, reason: reason.trim() });
      toast.success(`Đã thu bài của ${row.student_full_name}.`);
      onClose();
    } catch (error) {
      toast.error(actionErrorText(error, "thu bài"));
    }
  }

  return <AlertDialog open onOpenChange={(open) => { if (!open && !forceSubmit.isPending) onClose(); }}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Thu bài của {row.student_full_name}?</AlertDialogTitle>
        <AlertDialogDescription>
          Phiên làm bài kết thúc ngay và được chấm bằng các câu trả lời đã lưu
          ({row.answered_count}/{row.question_count} câu). Sinh viên không làm tiếp được. Thao tác này được ghi vào nhật ký.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div className="grid gap-1.5">
        <Label htmlFor="force-reason">Lý do</Label>
        <Textarea id="force-reason" rows={3} maxLength={255} placeholder="Ví dụ: vi phạm quy chế — sử dụng tài liệu"
          value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={touched && reasonError ? true : undefined}
          aria-describedby={touched && reasonError ? "force-reason-error" : undefined} />
        {touched && reasonError ? <div id="force-reason-error"><FieldError text={reasonError} /></div> : null}
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={forceSubmit.isPending}>Hủy</AlertDialogCancel>
        <AlertDialogAction variant="destructive" disabled={forceSubmit.isPending} onClick={(event) => { event.preventDefault(); void submit(); }}>
          {forceSubmit.isPending ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden /> : null}Thu bài
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
