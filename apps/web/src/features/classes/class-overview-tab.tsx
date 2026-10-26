import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/state-blocks";
import { MATERIAL_TYPE_META } from "@/features/materials/types";
import { formatMaterialDate } from "@/features/materials/format";
import { useMaterials } from "@/features/materials/use-materials";
import type { AssignmentSummary } from "@/types/api";
import { classAssignmentsQuery, openDeadlines } from "./class-assignments-query";
import { DeadlineList } from "./deadline-list";

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <header className="flex h-11 items-center justify-between gap-3 border-b px-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

/** Tab Tổng quan: bài sắp đến hạn của lớp + học liệu mới. */
export function ClassOverviewTab({ classId, assignmentHref, onOpenTab, canManage = false }: {
  classId: string;
  assignmentHref: (item: AssignmentSummary) => string;
  onOpenTab: (tab: "assignments" | "materials") => void;
  canManage?: boolean;
}) {
  const assignments = useQuery(classAssignmentsQuery(classId));
  const materials = useMaterials(classId);
  const deadlines = openDeadlines(assignments.data?.items ?? []).slice(0, 6)
    .map((d) => ({ ...d, href: assignmentHref(d.assignment) }));
  const drafts = canManage ? (assignments.data?.items ?? []).filter((a) => !a.is_published).length : 0;
  const recent = [...(materials.data?.items ?? [])]
    .sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5);
  const viewAll = (tab: "assignments" | "materials") => (
    <Button variant="ghost" size="xs" onClick={() => onOpenTab(tab)}>Xem tất cả</Button>
  );

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Panel title="Sắp đến hạn" action={viewAll("assignments")}>
        {assignments.isPending ? <ListSkeleton rows={3} />
          : assignments.isError ? <ErrorState error={assignments.error} onRetry={() => assignments.refetch()} />
          : deadlines.length === 0 ? (
            <EmptyState compact icon={CalendarCheck} title="Không có bài nào đang mở"
              description={canManage ? "Xuất bản bài tập hoặc quiz để sinh viên bắt đầu làm." : "Bài mới của lớp sẽ hiện ở đây."} />
          ) : <DeadlineList rows={deadlines} />}
        {drafts > 0 ? (
          <p className="border-t px-4 py-2.5 text-xs text-muted-foreground">
            {drafts} bản nháp chưa xuất bản —{" "}
            <button type="button" className="font-medium text-foreground underline-offset-4 hover:underline" onClick={() => onOpenTab("assignments")}>xem trong tab Bài tập</button>
          </p>
        ) : null}
      </Panel>
      <Panel title="Học liệu mới" action={viewAll("materials")}>
        {materials.isPending ? <ListSkeleton rows={3} />
          : materials.isError ? <ErrorState error={materials.error} onRetry={() => materials.refetch()} />
          : recent.length === 0 ? (
            <EmptyState compact icon={FolderOpen} title="Chưa có học liệu"
              description={canManage ? "Tải tệp hoặc dán liên kết trong tab Học liệu." : "Giảng viên chưa chia sẻ học liệu."} />
          ) : (
            <ul className="divide-y">
              {recent.map((material) => {
                const meta = MATERIAL_TYPE_META[material.type] ?? MATERIAL_TYPE_META.other;
                return (
                  <li key={material.id} className="flex items-center gap-3 px-4 py-2.5">
                    <meta.icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-sm">{material.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{formatMaterialDate(material.created_at)}</span>
                  </li>
                );
              })}
            </ul>
          )}
      </Panel>
    </div>
  );
}
