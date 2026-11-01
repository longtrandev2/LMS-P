import { useQuery } from "@tanstack/react-query";
import { CalendarCheck } from "lucide-react";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/state-blocks";
import { classAssignmentsQuery, openDeadlines } from "@/features/classes/class-assignments-query";
import { DeadlineList } from "@/features/classes/deadline-list";
import { SectionHeading, ViewAllButton } from "@/features/classes/section-heading";
import { MaterialsSection } from "@/features/materials/materials-section";

/**
 * Tab "Thông tin chung" của sinh viên: bài sắp đến hạn + toàn bộ học liệu của lớp
 * (học liệu gắn buổi cũng xuất hiện ở cột Học liệu của tab Lịch học).
 */
export function StudentOverviewTab({ classId, submittedIds, onOpenAssignments }: {
  classId: string;
  submittedIds: Set<number>;
  onOpenAssignments: () => void;
}) {
  const assignments = useQuery(classAssignmentsQuery(classId));
  const rows = openDeadlines(assignments.data?.items ?? []).slice(0, 6).map((deadline) => ({
    ...deadline,
    href: `/me/classes/${classId}/assignments/${deadline.assignment.id}`,
    submitted: submittedIds.has(deadline.assignment.id),
  }));

  return (
    <div className="space-y-10">
      <section aria-labelledby="student-overview-deadlines" className="space-y-2">
        <SectionHeading id="student-overview-deadlines" title="Sắp đến hạn" action={<ViewAllButton onClick={onOpenAssignments} />} />
        {assignments.isPending ? <ListSkeleton rows={3} />
          : assignments.isError ? <ErrorState error={assignments.error} onRetry={() => assignments.refetch()} />
          : rows.length === 0 ? (
            <EmptyState compact icon={CalendarCheck} className="items-start border-t px-0 py-6 text-left"
              title="Không có bài nào đang mở" description="Bài tập và quiz mới của lớp sẽ hiện ở đây." />
          ) : <DeadlineList rows={rows} />}
      </section>
      <MaterialsSection classId={classId} canManage={false} />
    </div>
  );
}
