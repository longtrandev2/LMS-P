import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import { queryKeys } from "@/lib/query-keys";

/** Chấm lại bài code (`POST /submissions/{id}/regrade`, BR8): bắt buộc lý do, giữ lịch sử kết quả. */
export function RegradeButton({ submissionId, assignmentId, disabled }: { submissionId: number; assignmentId: number; disabled?: boolean }) {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const error = touched && !reason.trim() ? "Nhập lý do chấm lại." : undefined;
  const regrade = useMutation({
    mutationFn: () => api.post(`/submissions/${submissionId}/regrade`, { reason: reason.trim() }),
    onSuccess: async () => {
      toast.success("Đã đưa bài vào hàng chờ chấm lại.");
      setOpen(false); setReason(""); setTouched(false);
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.submissions.detail(submissionId) }),
        client.invalidateQueries({ queryKey: queryKeys.assignments.submissions(assignmentId) }),
        client.invalidateQueries({ queryKey: queryKeys.assignments.results(assignmentId) }),
      ]);
    },
    onError: (err) => toast.error(errorText(err)),
  });
  function submit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (reason.trim()) regrade.mutate();
  }
  return <>
    <Button variant="outline" disabled={disabled} onClick={() => setOpen(true)}><RotateCcw aria-hidden />Chấm lại</Button>
    <Dialog open={open} onOpenChange={(value) => { if (!regrade.isPending) setOpen(value); }}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} noValidate className="space-y-4">
          <DialogHeader>
            <DialogTitle className="font-heading">Chấm lại bài nộp</DialogTitle>
            <DialogDescription>Bài sẽ về trạng thái chờ chấm; điểm lấy theo lần chấm mới nhất. Kết quả cũ vẫn được giữ trong lịch sử.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="regrade-reason">Lý do</Label>
            <Textarea id="regrade-reason" rows={3} maxLength={500} value={reason} placeholder="Ví dụ: đã sửa test #4 sai expected output"
              aria-invalid={error ? true : undefined} aria-describedby={error ? "regrade-reason-error" : undefined}
              onChange={(event) => setReason(event.target.value)} onBlur={() => setTouched(true)} />
            {error ? <p id="regrade-reason-error" className="text-xs text-destructive">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={regrade.isPending} onClick={() => setOpen(false)}>Hủy</Button>
            <Button type="submit" variant="cta" disabled={regrade.isPending}>{regrade.isPending ? "Đang gửi…" : "Chấm lại"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}
