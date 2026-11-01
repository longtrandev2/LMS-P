import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/state-blocks";
import { classAssignmentsQuery } from "@/features/classes/class-assignments-query";
import { AssignmentListItem } from "@/features/assignments/lecturer/assignment-list-item";
import { isExamItem } from "@/features/exams/shared/exam-labels";
import { useAssignmentActions } from "@/features/exams/shared/use-assignment-actions";

/**
 * Tab "Bài tập & Quiz" của lớp (không gồm kỳ thi — tab "Kỳ thi", exam-spec.md §8).
 * Giảng viên: tạo/sửa/xuất bản/xóa nháp/kết quả; sinh viên (`canTake`): mở bài.
 */
export function AssignmentsSection({ classId, canManage, canTake = false, submittedIds }: {
  classId: string; canManage: boolean; canTake?: boolean; submittedIds?: Set<number>;
}) {
  const list = useQuery(classAssignmentsQuery(classId));
  const actions = useAssignmentActions();

  const items = (list.data?.items ?? []).filter((item) => !isExamItem(item));
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
        canManage={canManage} canTake={canTake} submitted={submittedIds?.has(item.id)} busy={actions.busyId === item.id}
        onPublish={() => actions.publish(item)} onDelete={() => actions.requestDelete(item)} />)}</ul> : null}
    </div>
    {actions.dialogs}
  </section>;
}
