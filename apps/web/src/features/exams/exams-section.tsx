import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { NotebookPen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/state-blocks";
import { utcDateTimeMillis } from "@/lib/date-time";
import { classAssignmentsQuery } from "@/features/classes/class-assignments-query";
import { ExamListItem } from "./lecturer/exam-list-item";
import { isExamItem } from "./shared/exam-labels";
import { ExamStudentItem } from "./shared/exam-student-item";
import { useAssignmentActions } from "./shared/use-assignment-actions";
import type { AssignmentSummary } from "@/types/api";

/** Kỳ gần nhất lên đầu: theo giờ mở (hoặc giờ đóng), mới trước. */
const startOf = (item: AssignmentSummary) => utcDateTimeMillis(item.available_from ?? item.due_at);

/**
 * Tab "Kỳ thi" của lớp — docs/exam-spec.md §8: bài `midterm`/`final` (giảng viên thấy cả nháp).
 * Cùng nguồn dữ liệu với tab Bài tập (`GET /classes/{id}/assignments`).
 */
export function ExamsSection({ classId, canManage, canTake = false }: { classId: string; canManage: boolean; canTake?: boolean }) {
  const list = useQuery(classAssignmentsQuery(classId));
  const actions = useAssignmentActions();
  const items = (list.data?.items ?? []).filter(isExamItem).sort((a, b) => startOf(b) - startOf(a));
  const manage = canManage && !canTake;
  const drafts = manage ? items.filter((item) => !item.is_published).length : 0;

  return <section className="space-y-3" aria-label="Kỳ thi">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-semibold">Kỳ thi</h2>
        <p className="text-sm text-muted-foreground tabular-nums">
          {list.data ? `${items.length} kỳ thi${drafts ? ` · ${drafts} bản nháp chỉ giảng viên thấy` : ""}` : "Đang tải…"}
        </p>
      </div>
      {manage ? <Button asChild><Link to={`/classes/${classId}/assignments/new?category=midterm`}><Plus aria-hidden />Tạo kỳ thi</Link></Button> : null}
    </div>
    <div className="border-t">
      {list.isPending ? <ListSkeleton rows={3} /> : null}
      {list.isError ? <ErrorState error={list.error} onRetry={() => list.refetch()} /> : null}
      {list.data && items.length === 0 ? <EmptyState icon={NotebookPen} title="Chưa có kỳ thi"
        description={manage ? "Tạo kỳ thi giữa kỳ hoặc cuối kỳ: đặt thời lượng, cách giao đề và cấu trúc đề." : "Giảng viên chưa công bố kỳ thi nào cho lớp."}
        action={manage ? <Button asChild variant="secondary"><Link to={`/classes/${classId}/assignments/new?category=final`}>Tạo kỳ thi cuối kỳ</Link></Button> : undefined} /> : null}
      {items.length ? <ul>{items.map((item) => manage
        ? <ExamListItem key={item.id} item={item} classId={classId} busy={actions.busyId === item.id}
          onPublish={() => actions.publish(item)} onDelete={() => actions.requestDelete(item)} />
        : <ExamStudentItem key={item.id} item={item} classId={classId} />)}</ul> : null}
    </div>
    {manage ? actions.dialogs : null}
  </section>;
}
