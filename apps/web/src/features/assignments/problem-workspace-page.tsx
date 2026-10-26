import { useParams } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import { assignmentWindow } from "@/features/assignments/submission-window";
import { sortLatestFirst } from "@/features/assignments/submission-result";
import { WindowBadge } from "@/features/assignments/student/overview/assignment-info";
import { problemTitle } from "@/features/assignments/student/overview/programming-question-card";
import { BackLink, PageError, PageNotice, PageSkeleton } from "@/features/assignments/student/page-states";
import { routeId, studentPaths } from "@/features/assignments/student/paths";
import { useAssignmentDetails, useMySubmissions } from "@/features/assignments/student/use-student-data";
import { ProblemWorkspace } from "@/features/assignments/student/workspace/problem-workspace";

/** `/me/classes/:classId/assignments/:assignmentId/problems/:questionId` — workspace code (assessment-spec §8). */
export function ProblemWorkspacePage() {
  const { classId = "", assignmentId, questionId } = useParams();
  const id = routeId(assignmentId);
  const qid = routeId(questionId);
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const details = useAssignmentDetails(id);
  const history = useMySubmissions(id);
  const back = <BackLink to={studentPaths.overview(classId, assignmentId ?? "")}>{details.data?.assignment.title ?? "Về trang bài"}</BackLink>;

  if (!Number.isFinite(id) || !Number.isFinite(qid)) return <PageNotice back={back} title="Không tìm thấy câu hỏi" description="Đường dẫn không hợp lệ." />;
  if (!details.data || !history.data) {
    const error = details.error ?? history.error;
    return error && !details.isFetching && !history.isFetching
      ? <PageError back={back} error={error} onRetry={() => { void details.refetch(); void history.refetch(); }} />
      : <PageSkeleton />;
  }

  const index = details.data.questions.findIndex((row) => row.question_id === qid);
  const question = details.data.questions[index];
  if (!question || question.type !== "programming") {
    return <PageNotice back={back} title="Không tìm thấy câu lập trình" description="Câu hỏi không thuộc bài này hoặc không phải câu lập trình." />;
  }
  const item = details.data.assignment;
  const rows = sortLatestFirst(history.data.filter((row) => row.question_id === qid));

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {back}
      <span className="text-muted-foreground" aria-hidden>/</span>
      <h1 className="min-w-0 truncate text-base font-semibold">Câu {index + 1}<span className="font-normal text-muted-foreground"> · {problemTitle(question.content) || "Bài lập trình"}</span></h1>
      <span className="ml-auto"><WindowBadge window={assignmentWindow(item)} /></span>
    </div>
    <ProblemWorkspace key={qid} item={item} question={question} history={rows} userId={userId} />
  </div>;
}
