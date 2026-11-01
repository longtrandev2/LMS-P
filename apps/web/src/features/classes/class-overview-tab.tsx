import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, FolderOpen } from "lucide-react";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/state-blocks";
import { useMaterials } from "@/features/materials/use-materials";
import type { AssignmentSummary, ClassSummary } from "@/types/api";
import { classAssignmentsQuery, openDeadlines } from "./class-assignments-query";
import { ClassSummaryPanel } from "./class-summary-panel";
import { DeadlineList } from "./deadline-list";
import { RecentMaterialsList } from "./recent-materials-list";
import { SectionHeading, ViewAllButton } from "./section-heading";

const EMPTY_LEFT = "items-start px-0 py-6 text-left";

/** Tab Tổng quan: "Sắp đến hạn" + "Học liệu mới" dạng danh sách hàng không khung; GV có thêm panel tóm tắt bên phải. */
export function ClassOverviewTab({ classId, clazz, assignmentHref, onOpenTab, canManage = false, summary = false, submittedIds }: {
  classId: string;
  clazz?: ClassSummary;
  assignmentHref: (item: AssignmentSummary) => string;
  onOpenTab: (tab: "assignments" | "materials" | "students") => void;
  canManage?: boolean;
  /** Hiện panel tóm tắt bên phải (trang lớp GV/quản trị). */
  summary?: boolean;
  /** Bài sinh viên đã nộp — hàng "Sắp đến hạn" hiện "Đã nộp" thay vì đếm ngược. */
  submittedIds?: Set<number>;
}) {
  const assignments = useQuery(classAssignmentsQuery(classId));
  const materials = useMaterials(classId);
  const items = assignments.data?.items ?? [];
  const deadlines = openDeadlines(items).slice(0, 6).map((d) => ({ ...d, href: assignmentHref(d.assignment), submitted: submittedIds?.has(d.assignment.id) }));
  const recent = [...(materials.data?.items ?? [])]
    .sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5);

  const main = (
    <div className="min-w-0 space-y-10">
      <section aria-labelledby="overview-deadlines" className="space-y-2">
        <SectionHeading id="overview-deadlines" title="Sắp đến hạn" action={<ViewAllButton onClick={() => onOpenTab("assignments")} />} />
        {assignments.isPending ? <ListSkeleton rows={3} />
          : assignments.isError ? <ErrorState error={assignments.error} onRetry={() => assignments.refetch()} />
          : deadlines.length === 0 ? (
            <EmptyState compact icon={CalendarCheck} className={EMPTY_LEFT} title="Không có bài nào đang mở"
              description={canManage ? "Xuất bản bài tập hoặc quiz để sinh viên bắt đầu làm." : "Bài mới của lớp sẽ hiện ở đây."} />
          ) : <DeadlineList rows={deadlines} />}
      </section>
      <section aria-labelledby="overview-materials" className="space-y-2">
        <SectionHeading id="overview-materials" title="Học liệu mới" action={<ViewAllButton onClick={() => onOpenTab("materials")} />} />
        {materials.isPending ? <ListSkeleton rows={3} />
          : materials.isError ? <ErrorState error={materials.error} onRetry={() => materials.refetch()} />
          : recent.length === 0 ? (
            <EmptyState compact icon={FolderOpen} className={EMPTY_LEFT} title="Chưa có học liệu"
              description={canManage ? "Tải tệp hoặc dán liên kết trong tab Học liệu." : "Giảng viên chưa chia sẻ học liệu."} />
          ) : <RecentMaterialsList items={recent} onOpen={() => onOpenTab("materials")} />}
      </section>
    </div>
  );

  if (!summary) return main;
  return (
    <div className="grid items-start gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_17rem]">
      {main}
      <ClassSummaryPanel clazz={clazz} assignments={assignments.data ? items : undefined}
        materialCount={materials.data?.total} onOpenTab={onOpenTab} />
    </div>
  );
}
