import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CalendarClock, Hourglass, ListOrdered, Pencil, Sigma, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorState } from "@/components/state-blocks";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { hasRole } from "@/stores/auth";
import { CATEGORY_ICON, categoryLabel, formatPoints, shortDateTime } from "@/features/assignments/lecturer/labels";
import { MetaItem, MetaRow } from "@/features/assignments/lecturer/meta-row";
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
  return <div className="mx-auto max-w-6xl space-y-8">
    {details.isError ? <ErrorState error={details.error} onRetry={() => details.refetch()} /> : null}
    {details.isPending ? <div aria-busy="true" aria-label="Đang tải" className="space-y-3"><Skeleton className="h-7 w-72" /><Skeleton className="h-4 w-96 max-w-full" /></div> : null}
    {assignment ? <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-semibold text-balance">{assignment.title}</h1>
          {assignment.is_published ? <Badge variant="success">Đã xuất bản</Badge> : <Badge>Nháp</Badge>}
        </div>
        <MetaRow>
          <MetaItem icon={CATEGORY_ICON[assignment.category]}>{categoryLabel(assignment.category)}</MetaItem>
          <MetaItem icon={ListOrdered}>{assignment.question_count} câu</MetaItem>
          <MetaItem icon={Sigma}>{formatPoints(assignment.total_points)} điểm</MetaItem>
          <MetaItem icon={CalendarClock}>Hạn {shortDateTime(assignment.due_at)}</MetaItem>
          {assignment.allow_late && assignment.late_due_at ? <MetaItem icon={Hourglass}>Muộn đến {shortDateTime(assignment.late_due_at)}</MetaItem> : null}
          {results.data ? <MetaItem icon={Users}>{results.data.length} sinh viên</MetaItem> : null}
        </MetaRow>
      </div>
      {hasRole(user, "lecturer") ? <Button variant="secondary" asChild>
        <Link to={`/classes/${classId}/assignments/${id}/edit`}><Pencil aria-hidden />{assignment.is_published ? "Điều chỉnh" : "Sửa"}</Link>
      </Button> : null}
    </header> : null}

    <ResultsSummary rows={results.data} submissions={submissions.data} maxScore={assignment?.total_points ?? 0} />

    <Tabs value={tab} onValueChange={setTab} className="gap-4">
      <TabsList variant="line">
        <TabsTrigger value="students">Theo sinh viên</TabsTrigger>
        <TabsTrigger value="submissions">Bài nộp{submissionCount != null ? <span className="text-muted-foreground tabular-nums">{submissionCount}</span> : null}</TabsTrigger>
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
