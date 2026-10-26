import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Pencil } from "lucide-react";
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
    {details.isError ? <ErrorState error={details.error} onRetry={() => details.refetch()} /> : null}
    {details.isPending ? <div aria-busy="true" aria-label="Đang tải" className="space-y-2"><Skeleton className="h-7 w-72" /><Skeleton className="h-4 w-96 max-w-full" /></div> : null}
    {assignment ? <PageHeader title={assignment.title}
      meta={<>
        <Badge variant="outline">{categoryLabel(assignment.category)}</Badge>
        <Badge variant={assignment.is_published ? "success" : "secondary"}>{assignment.is_published ? "Đã xuất bản" : "Bản nháp"}</Badge>
        <span className="tabular-nums">{assignment.question_count} câu · {formatPoints(assignment.total_points)} điểm</span>
        <span className="tabular-nums">Hạn {formatUtcDateTime(assignment.due_at)}{assignment.allow_late && assignment.late_due_at ? ` · nộp muộn đến ${formatUtcDateTime(assignment.late_due_at)}` : ""}</span>
      </>}
      actions={hasRole(user, "lecturer") ? <Button variant="outline" asChild>
        <Link to={`/classes/${classId}/assignments/${id}/edit`}><Pencil aria-hidden />{assignment.is_published ? "Điều chỉnh" : "Sửa"}</Link>
      </Button> : undefined} /> : null}

    <ResultsSummary rows={results.data} submissions={submissions.data} maxScore={assignment?.total_points ?? 0} />

    <Tabs value={tab} onValueChange={setTab} className="gap-4">
      <TabsList variant="line">
        <TabsTrigger value="students">Theo sinh viên</TabsTrigger>
        <TabsTrigger value="submissions">Bài nộp{submissionCount != null ? ` (${submissionCount})` : ""}</TabsTrigger>
      </TabsList>
      <TabsContent value="students">
        <ResultsStudentsTab query={results} questions={questions} quiz={quiz}
          attemptHref={(attemptId) => `/me/classes/${classId}/assignments/${id}/attempts/${attemptId}`} />
      </TabsContent>
      <TabsContent value="submissions">
        <ResultsSubmissionsTab query={submissions} questions={questions} positionOf={positionOf} />
      </TabsContent>
    </Tabs>
  </div>;
}
