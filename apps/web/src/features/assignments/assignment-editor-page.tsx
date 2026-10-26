import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { ErrorState } from "@/components/state-blocks";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { AssignmentEditorForm } from "@/features/assignments/lecturer/assignment-editor-form";
import { categoryLabel } from "@/features/assignments/lecturer/labels";
import type { AssignmentDetails, ClassSummary } from "@/types/api";

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

  const assignment = details.data?.assignment;
  const title = id == null ? "Tạo bài tập / quiz" : assignment?.is_published ? "Điều chỉnh bài đã xuất bản" : "Sửa bản nháp";
  return <div className="mx-auto max-w-4xl space-y-6">
    <Link to={`/classes/${classId}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
      <ArrowLeft className="size-4" aria-hidden />{clazz.data ? `${clazz.data.code} · ${clazz.data.name}` : "Về lớp"}
    </Link>
    <PageHeader title={assignment ? assignment.title || title : title}
      description={id == null ? "Soạn đề theo từng mục rồi lưu nháp hoặc xuất bản. Xuất bản sẽ ghim phiên bản câu hỏi, điểm và thứ tự." : title}
      actions={assignment ? <div className="flex gap-2">
        <Badge variant="outline">{categoryLabel(assignment.category)}</Badge>
        <Badge variant={assignment.is_published ? "default" : "secondary"}>{assignment.is_published ? "Đã xuất bản" : "Bản nháp"}</Badge>
      </div> : undefined} />
    {id != null && details.isPending ? <div className="space-y-4"><Skeleton className="h-56 rounded-xl" /><Skeleton className="h-72 rounded-xl" /></div> : null}
    {details.isError ? <ErrorState error={details.error} onRetry={() => details.refetch()} /> : null}
    {id == null || details.data
      ? <AssignmentEditorForm key={id ?? "new"} classId={Number(classId)} details={details.data ?? null} />
      : null}
  </div>;
}
