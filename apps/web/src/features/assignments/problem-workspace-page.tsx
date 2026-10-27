import { useParams } from "react-router-dom";
import { Award, Cpu, Equal, Timer } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { assignmentWindow } from "@/features/assignments/submission-window";
import { formatScore, sortLatestFirst } from "@/features/assignments/submission-result";
import { CHECKER_SHORT } from "@/features/assignments/student/labels";
import { MetaRow } from "@/features/assignments/student/meta-row";
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
  const programming = question.programming;

  const header = <div className="space-y-2">
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span>Câu {index + 1}/{details.data.questions.length}</span>
      <WindowBadge window={assignmentWindow(item)} />
    </div>
    <h1 className="text-lg leading-snug font-semibold tracking-tight text-balance">{problemTitle(question.content) || "Bài lập trình"}</h1>
    <MetaRow className="text-[13px]" items={[
      programming ? { icon: Timer, text: `${programming.time_limit_ms} ms` } : null,
      programming ? { icon: Cpu, text: `${programming.memory_limit_mb} MB` } : null,
      { icon: Award, text: `${formatScore(question.points)} điểm` },
      programming ? { icon: Equal, text: CHECKER_SHORT[programming.checker_mode] } : null,
    ]} />
  </div>;

  return <ProblemWorkspace key={qid} item={item} question={question} history={rows} userId={userId} header={header} />;
}
