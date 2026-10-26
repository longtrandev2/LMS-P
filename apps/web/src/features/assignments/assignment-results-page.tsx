import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { ErrorState } from "@/components/state-blocks";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { formatUtcDateTime } from "@/lib/date-time";
import { hasRole } from "@/stores/auth";
import { categoryLabel, formatPoints } from "@/features/assignments/lecturer/labels";
import { ResultsStudentsTab } from "@/features/assignments/lecturer/results-students-tab";
import { ResultsSubmissionsTab } from "@/features/assignments/lecturer/results-submissions-tab";
import { ResultsSummary } from "@/features/assignments/lecturer/results-summary";
import { useAssignmentResults } from "@/features/assignments/lecturer/use-assignment-results";

/** `/classes/:classId/assignments/:assignmentId/results` — kết quả theo sinh viên + danh sách bài nộp. */
export function AssignmentResultsPage() {
  const { classId = "", assignmentId = "" } = useParams();
  const { status, user } = useAuthGuard(["lecturer", "admin"]);
  const id = Number(assignmentId);
  const [tab, setTab] = useState("students");
  const { details, results, submissions, questions, positionOf } = useAssignmentResults(id, status === "ok");
  if (status !== "ok") return null;

  const assignment = details.data?.assignment;
  const quiz = assignment?.category === "quiz";
  const submissionCount = submissions.data?.length;
  return <div className="space-y-6">
    <Link to={`/classes/${classId}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
      <ArrowLeft className="size-4" aria-hidden />Về lớp
    </Link>
    {details.isError ? <ErrorState error={details.error} onRetry={() => details.refetch()} /> : null}
    {details.isPending ? <Skeleton className="h-16 w-2/3" /> : null}
    {assignment ? <PageHeader title={assignment.title}
      description={`${categoryLabel(assignment.category)} · ${assignment.question_count} câu · ${formatPoints(assignment.total_points)} điểm · Hạn ${formatUtcDateTime(assignment.due_at)}${assignment.allow_late && assignment.late_due_at ? ` · nộp muộn đến ${formatUtcDateTime(assignment.late_due_at)}` : ""}`}
      actions={<div className="flex flex-wrap items-center gap-2">
        <Badge variant={assignment.is_published ? "default" : "secondary"}>{assignment.is_published ? "Đã xuất bản" : "Bản nháp"}</Badge>
        {hasRole(user, "lecturer") ? <Button variant="outline" size="sm" asChild>
          <Link to={`/classes/${classId}/assignments/${id}/edit`}><Pencil aria-hidden />{assignment.is_published ? "Điều chỉnh" : "Sửa"}</Link>
        </Button> : null}
      </div>} /> : null}

    <ResultsSummary rows={results.data} submissions={submissions.data} maxScore={assignment?.total_points ?? 0} />

    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="students">Theo sinh viên</TabsTrigger>
        <TabsTrigger value="submissions">Bài nộp{submissionCount != null ? ` (${submissionCount})` : ""}</TabsTrigger>
      </TabsList>
      <TabsContent value="students" className="mt-2">
        <ResultsStudentsTab query={results} questions={questions} quiz={quiz}
          attemptHref={(attemptId) => `/me/classes/${classId}/assignments/${id}/attempts/${attemptId}`} />
      </TabsContent>
      <TabsContent value="submissions" className="mt-2">
        <ResultsSubmissionsTab query={submissions} questions={questions} positionOf={positionOf} />
      </TabsContent>
    </Tabs>
  </div>;
}
