import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { errorText } from "@/lib/error-messages";
import { LEAVE_STATUS_LABEL, LEAVE_STATUS_TONE, periodRange, sessionDateLabel } from "@/lib/schedule";
import type { LeaveRequest } from "@/types/api";
import { downloadEvidence, formatBytes, useReviewLeaveRequest } from "./use-leave-requests";

/**
 * Xem đơn xin nghỉ; khi còn chờ cho phép Duyệt (đỏ) / Từ chối (xám) kèm ghi chú.
 * `intent` chọn sẵn hành động khi mở từ nút trong bảng.
 */
export function LeaveReviewDialog({ classId, request, intent, onOpenChange }: {
  classId: string; request: LeaveRequest; intent?: "approved" | "rejected"; onOpenChange: (open: boolean) => void;
}) {
  const review = useReviewLeaveRequest(classId);
  const [note, setNote] = useState("");
  const pending = request.status === "pending";

  async function submit(status: "approved" | "rejected") {
    try {
      await review.mutateAsync({ id: request.id, status, note });
      toast.success(status === "approved" ? "Đã duyệt đơn — điểm danh buổi được ghi Có phép." : "Đã từ chối đơn.");
      onOpenChange(false);
    } catch (e) { toast.error(errorText(e)); }
  }
  async function download() {
    try { await downloadEvidence(request); } catch (e) { toast.error(errorText(e)); }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{intent === "approved" ? "Duyệt đơn xin nghỉ" : intent === "rejected" ? "Từ chối đơn xin nghỉ" : "Đơn xin nghỉ"}</DialogTitle>
          <DialogDescription>
            {request.full_name}{request.student_code ? <span className="font-mono"> · {request.student_code}</span> : null}
          </DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[6.5rem_1fr] gap-x-3 gap-y-2.5 text-sm">
          <dt className="text-muted-foreground">Buổi</dt>
          <dd className="tabular-nums">{sessionDateLabel(request.session_date)} · Tiết {request.start_period}–{request.end_period} <span className="text-muted-foreground">({periodRange(request.start_period, request.end_period)})</span></dd>
          <dt className="text-muted-foreground">Lý do</dt>
          <dd className="whitespace-pre-wrap">{request.reason}</dd>
          <dt className="text-muted-foreground">Minh chứng</dt>
          <dd><Button variant="secondary" size="sm" onClick={download}><Download aria-hidden /> <span className="max-w-56 truncate">{request.evidence_name}</span>
            <span className="text-muted-foreground tabular-nums">{formatBytes(request.evidence_size)}</span></Button></dd>
          <dt className="text-muted-foreground">Trạng thái</dt>
          <dd><Badge variant={LEAVE_STATUS_TONE[request.status]}>{LEAVE_STATUS_LABEL[request.status]}</Badge>
            {request.reviewed_by_name ? <span className="ml-2 text-muted-foreground">bởi {request.reviewed_by_name}</span> : null}</dd>
          {request.review_note ? <><dt className="text-muted-foreground">Ghi chú</dt><dd>{request.review_note}</dd></> : null}
        </dl>
        {pending ? (
          <div className="space-y-2">
            <Label htmlFor="review-note">Ghi chú cho sinh viên <span className="text-muted-foreground">(tùy chọn)</span></Label>
            <Textarea id="review-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
            <p className="text-xs text-muted-foreground">Duyệt sẽ ghi điểm danh buổi này là Có phép, trừ khi sinh viên đã Có mặt hoặc Muộn.</p>
          </div>
        ) : null}
        <DialogFooter>
          {!pending ? <Button variant="secondary" onClick={() => onOpenChange(false)}>Đóng</Button>
            : intent ? (
              <>
                <Button variant="ghost" onClick={() => onOpenChange(false)}>Hủy</Button>
                <Button disabled={review.isPending} onClick={() => submit(intent)}>{intent === "approved" ? "Duyệt đơn" : "Từ chối đơn"}</Button>
              </>
            ) : (
              <>
                <Button variant="secondary" disabled={review.isPending} onClick={() => submit("rejected")}>Từ chối</Button>
                <Button disabled={review.isPending} onClick={() => submit("approved")}>Duyệt đơn</Button>
              </>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
