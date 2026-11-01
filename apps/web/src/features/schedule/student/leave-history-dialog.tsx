import { useState } from "react";
import { toast } from "sonner";
import { FileX } from "lucide-react";
import { SearchField } from "@/components/list-toolbar";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/state-blocks";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { errorText } from "@/lib/error-messages";
import type { ClassSummary, LeaveRequest } from "@/types/api";
import { LeaveHistoryTable } from "./leave-history-table";
import { fold, shortDate } from "./schedule-format";
import { useCancelLeaveRequest, useMyLeaveRequests } from "./use-student-schedule";

/** Dialog "Lịch sử đơn xin nghỉ học — mã lớp": tìm theo lý do, tổng số, hủy đơn còn chờ duyệt. */
export function LeaveHistoryDialog({ classId, clazz, onOpenChange }: {
  classId: string;
  clazz?: ClassSummary;
  onOpenChange: (open: boolean) => void;
}) {
  const list = useMyLeaveRequests(classId);
  const cancel = useCancelLeaveRequest(classId);
  const [search, setSearch] = useState("");
  const [confirming, setConfirming] = useState<LeaveRequest | null>(null);
  const needle = fold(search.trim());
  const items = (list.data ?? [])
    .filter((item) => !needle || fold(item.reason).includes(needle))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  async function confirmCancel() {
    if (!confirming) return;
    try {
      await cancel.mutateAsync(confirming.id);
      toast.success("Đã hủy đơn xin nghỉ.");
    } catch (error) {
      toast.error(errorText(error));
    } finally {
      setConfirming(null);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] grid-rows-[auto_auto_minmax(0,1fr)] sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Lịch sử đơn xin nghỉ học{clazz ? <> — <span className="font-mono">{clazz.code}</span></> : null}</DialogTitle>
          <DialogDescription>Các đơn bạn đã gửi trong lớp này, mới nhất ở trên.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-3">
          <SearchField value={search} onChange={setSearch} placeholder="Tìm theo lý do…" className="w-full sm:w-72" />
          <p className="ml-auto text-sm text-muted-foreground">
            Tổng số: <span className="font-semibold text-primary tabular-nums">{items.length}</span>
          </p>
        </div>
        <div className="min-h-0 overflow-y-auto">
          {list.isPending ? <TableSkeleton rows={3} cols={6} />
            : list.isError ? <ErrorState error={list.error} onRetry={() => list.refetch()} className="py-8" />
            : items.length === 0 ? (
              <EmptyState compact icon={FileX} title={needle ? "Không có đơn khớp lý do đã nhập" : "Bạn chưa gửi đơn xin nghỉ nào"}
                description={needle ? "Thử từ khóa khác." : "Bấm biểu tượng thư ở cột Thao tác của buổi học để gửi đơn."} />
            ) : <LeaveHistoryTable items={items} onCancel={setConfirming} cancellingId={cancel.isPending ? cancel.variables ?? null : null} />}
        </div>
      </DialogContent>
      <AlertDialog open={confirming != null} onOpenChange={(open) => { if (!open && !cancel.isPending) setConfirming(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hủy đơn xin nghỉ?</AlertDialogTitle>
            <AlertDialogDescription>
              Đơn cho buổi {confirming ? shortDate(confirming.session_date) : ""} sẽ chuyển sang “Đã hủy”. Bạn có thể gửi đơn mới nếu buổi học còn trong hạn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancel.isPending}>Giữ đơn</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={cancel.isPending}
              onClick={(event) => { event.preventDefault(); void confirmCancel(); }}>
              {cancel.isPending ? "Đang hủy…" : "Hủy đơn"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
