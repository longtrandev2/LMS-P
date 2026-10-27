import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/state-blocks";
import { api, ApiError } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import { queryKeys } from "@/lib/query-keys";
import { AssignmentListItem } from "@/features/assignments/lecturer/assignment-list-item";
import { PublishConflictDialog } from "@/features/assignments/lecturer/publish-conflict-dialog";
import { conflictQuestionIds, type PublishConflict } from "@/features/assignments/lecturer/use-save-assignment";
import type { AssignmentSummary, Paginated } from "@/types/api";

/** Tab "Bài tập & Quiz" của lớp. Giảng viên: tạo/sửa/xuất bản/xóa nháp/kết quả; sinh viên (`canTake`): mở bài. */
export function AssignmentsSection({ classId, canManage, canTake = false }: {
  classId: string; canManage: boolean; canTake?: boolean;
}) {
  const client = useQueryClient();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<AssignmentSummary | null>(null);
  const [conflict, setConflict] = useState<(PublishConflict & { item: AssignmentSummary }) | null>(null);
  const list = useQuery({
    queryKey: queryKeys.assignments.class(classId),
    queryFn: ({ signal }) => api.get<Paginated<AssignmentSummary>>(`/classes/${classId}/assignments`, { page: 1, limit: 100 }, signal),
  });
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
      } else toast.error(errorText(error));
    } finally { setBusyId(null); }
  }
  async function remove(item: AssignmentSummary) {
    setBusyId(item.id);
    try { await api.delete(`/assignments/${item.id}`); toast.success("Đã xóa bản nháp."); setDeleting(null); void invalidate(); }
    catch (error) { toast.error(errorText(error)); }
    finally { setBusyId(null); }
  }

  const items = list.data?.items ?? [];
  const drafts = canManage ? items.filter((item) => !item.is_published).length : 0;
  return <section className="space-y-3" aria-label="Bài tập và quiz">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-semibold">Bài tập & quiz</h2>
        <p className="text-sm text-muted-foreground tabular-nums">
          {list.data ? `${items.length} bài${drafts ? ` · ${drafts} bản nháp chỉ giảng viên thấy` : ""}` : "Đang tải…"}
        </p>
      </div>
      {canManage ? <Button asChild><Link to={`/classes/${classId}/assignments/new`}><Plus aria-hidden />Tạo bài tập</Link></Button> : null}
    </div>
    <div className="border-t">
      {list.isPending ? <ListSkeleton rows={3} /> : null}
      {list.isError ? <ErrorState error={list.error} onRetry={() => list.refetch()} /> : null}
      {list.data && items.length === 0 ? <EmptyState icon={ClipboardList} title="Chưa có bài tập hoặc quiz"
        description={canManage ? "Tạo bản nháp, chọn câu hỏi rồi xuất bản để sinh viên làm." : "Giảng viên chưa đăng bài nào cho lớp."} /> : null}
      {items.length ? <ul>{items.map((item) => <AssignmentListItem key={item.id} item={item} classId={classId}
        canManage={canManage} canTake={canTake} busy={busyId === item.id}
        onPublish={() => void publish(item)} onDelete={() => setDeleting(item)} />)}</ul> : null}
    </div>

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
  </section>;
}
