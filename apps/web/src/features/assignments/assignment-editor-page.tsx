import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/state-blocks";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { AssignmentEditorForm } from "@/features/assignments/lecturer/assignment-editor-form";
import { categoryLabel } from "@/features/assignments/lecturer/labels";
import type { AssignmentDetails, ClassSummary } from "@/types/api";

function EditorSkeleton() {
  return <div aria-busy="true" aria-label="Đang tải" className="space-y-8">
    <Skeleton className="h-12 w-72" />
    {[0, 1, 2].map((key) => <div key={key} className="grid gap-x-8 gap-y-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-48" /></div>
      <Skeleton className="h-48 rounded-xl" />
    </div>)}
  </div>;
}

/** `/classes/:classId/assignments/new` và `…/:assignmentId/edit` — soạn đề (docs/assessment-spec.md §8). */
export function AssignmentEditorPage() {
  const { classId = "", assignmentId } = useParams();
  const { status } = useAuthGuard(["lecturer"]);
  const id = assignmentId ? Number(assignmentId) : null;
  const clazz = useQuery({
    queryKey: queryKeys.classes.detail(classId),
    queryFn: ({ signal }) => api.get<ClassSummary>(`/classes/${classId}`, undefined, signal),
    enabled: status === "ok",
  });
  const details = useQuery({
    queryKey: queryKeys.assignments.details(id ?? 0),
    queryFn: ({ signal }) => api.get<AssignmentDetails>(`/assignments/${id}`, undefined, signal),
    enabled: status === "ok" && id != null,
    staleTime: Infinity,
  });
  if (status !== "ok") return null;
  if (details.isError) return <ErrorState error={details.error} onRetry={() => details.refetch()} />;
  if (id != null && details.isPending) return <EditorSkeleton />;

  const assignment = details.data?.assignment;
  const fallback = id == null ? "Bài tập / quiz mới" : assignment?.is_published ? "Điều chỉnh bài đã xuất bản" : "Sửa bản nháp";
  const classLabel = clazz.data ? `${clazz.data.code} · ${clazz.data.name}` : "Lớp học";
  const badges = assignment ? <>
    <Badge variant="outline">{categoryLabel(assignment.category)}</Badge>
    <Badge variant={assignment.is_published ? "success" : "secondary"}>{assignment.is_published ? "Đã xuất bản" : "Bản nháp"}</Badge>
  </> : undefined;
  return <AssignmentEditorForm key={id ?? "new"} classId={Number(classId)} details={details.data ?? null}
    title={assignment?.title || fallback} classLabel={classLabel} badges={badges} />;
}
