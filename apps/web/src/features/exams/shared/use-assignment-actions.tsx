import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { api, ApiError } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import { queryKeys } from "@/lib/query-keys";
import { PublishConflictDialog } from "@/features/assignments/lecturer/publish-conflict-dialog";
import { conflictQuestionIds, type PublishConflict } from "@/features/assignments/lecturer/use-save-assignment";
import { hasBlueprintDetails } from "@/features/exams/lecturer/blueprint/publish-issue";
import type { AssignmentSummary } from "@/types/api";

/**
 * Xuất bản / xóa nháp từ danh sách (tab Bài tập, tab Kỳ thi). Trả `dialogs` để đặt cuối section:
 * xác nhận xóa (AlertDialog) và xung đột kiểm tra đề lập trình (409 PROBLEM_*).
 */
export function useAssignmentActions() {
  const client = useQueryClient();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<AssignmentSummary | null>(null);
  const [conflict, setConflict] = useState<(PublishConflict & { item: AssignmentSummary }) | null>(null);
  const invalidate = () => client.invalidateQueries({ queryKey: queryKeys.assignments.all });

  async function publish(item: AssignmentSummary, confirmUnverified = false) {
    setBusyId(item.id);
    try {
      await api.post(`/assignments/${item.id}/publish`, confirmUnverified ? { confirm_unverified: true } : {});
      toast.success(`Đã xuất bản “${item.title}”.`);
      setConflict(null);
      void invalidate();
    } catch (error) {
      if (error instanceof ApiError && (error.code === "PROBLEM_UNVERIFIED" || error.code === "PROBLEM_CHECK_FAILED")) {
        setConflict({ code: error.code, message: errorText(error), questionIds: conflictQuestionIds(error.details), item });
      } else if (hasBlueprintDetails(error)) {
        toast.error(`${errorText(error)} Mở trình soạn hoặc trang xem trước đề để xem chi tiết.`);
      } else toast.error(errorText(error));
    } finally { setBusyId(null); }
  }
  async function remove(item: AssignmentSummary) {
    setBusyId(item.id);
    try { await api.delete(`/assignments/${item.id}`); toast.success("Đã xóa bản nháp."); setDeleting(null); void invalidate(); }
    catch (error) { toast.error(errorText(error)); }
    finally { setBusyId(null); }
  }

  const dialogs = <>
    <AlertDialog open={deleting != null} onOpenChange={(open) => !open && setDeleting(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xóa bản nháp?</AlertDialogTitle>
          <AlertDialogDescription>“{deleting?.title}” sẽ bị xóa vĩnh viễn. Câu hỏi trong ngân hàng không bị ảnh hưởng.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busyId != null}>Hủy</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={busyId != null}
            onClick={(event) => { event.preventDefault(); if (deleting) void remove(deleting); }}>
            {busyId != null ? "Đang xóa…" : "Xóa bản nháp"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <PublishConflictDialog conflict={conflict} busy={busyId != null} onCancel={() => setConflict(null)}
      onConfirm={() => { if (conflict) void publish(conflict.item, true); }} />
  </>;

  return { busyId, publish: (item: AssignmentSummary) => void publish(item), requestDelete: setDeleting, dialogs };
}
