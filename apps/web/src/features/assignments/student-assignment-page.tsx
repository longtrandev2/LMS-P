import { useParams } from "react-router-dom";
import { MarkdownView } from "@/components/markdown-view";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { AssignmentInfo } from "@/features/assignments/student/overview/assignment-info";
import { QuestionListSection } from "@/features/assignments/student/overview/question-list-section";
import { QuizAttemptsSection } from "@/features/assignments/student/overview/quiz-attempts-section";
import { CATEGORY_LABEL, attemptsText } from "@/features/assignments/student/labels";
import { BackLink, PageError, PageNotice, PageSkeleton } from "@/features/assignments/student/page-states";
import { routeId, studentPaths } from "@/features/assignments/student/paths";
import { useAssignmentDetails, useQuizAttempts } from "@/features/assignments/student/use-student-data";

/** `/me/classes/:classId/assignments/:assignmentId` — tổng quan bài của sinh viên (assessment-spec §8). */
export function StudentAssignmentPage() {
  const { classId = "", assignmentId } = useParams();
  const id = routeId(assignmentId);
  const details = useAssignmentDetails(id);
  const isQuiz = details.data?.assignment.category === "quiz";
  const attempts = useQuizAttempts(id, isQuiz);
  const back = <BackLink to={studentPaths.classPage(classId)}>Bài tập của lớp</BackLink>;

  if (!Number.isFinite(id)) return <PageNotice back={back} title="Không tìm thấy bài" description="Đường dẫn không hợp lệ." />;
  if (!details.data) {
    return details.isError ? <PageError back={back} error={details.error} onRetry={() => void details.refetch()} /> : <PageSkeleton />;
  }

  const item = details.data.assignment;
  const attemptsInfo = isQuiz
    ? (attempts.data ? attemptsText(attempts.data.length, item.max_attempts) : "Đang tải…")
    : item.max_attempts == null ? "Không giới hạn lượt mỗi câu" : `Tối đa ${item.max_attempts} lượt mỗi câu`;

  return <div className="space-y-6">
    {back}
    <PageHeader title={item.title} meta={<>
      <Badge variant="outline">{CATEGORY_LABEL[item.category]}</Badge>
      <span className="tabular-nums">{item.question_count} câu · {item.total_points} điểm</span>
    </>} />
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="order-2 min-w-0 space-y-6 lg:order-1">
        {item.description?.trim() ? <section aria-label="Mô tả" className="rounded-xl border bg-card p-4 sm:p-5">
          <MarkdownView source={item.description} />
        </section> : null}
        {isQuiz
          ? <QuizAttemptsSection item={item} attempts={attempts.data ?? []} isPending={attempts.isPending}
              error={attempts.error} onRetry={() => void attempts.refetch()} />
          : <QuestionListSection details={details.data} />}
      </div>
      <aside className="order-1 lg:sticky lg:top-20 lg:order-2">
        <AssignmentInfo item={item} attempts={attemptsInfo} />
      </aside>
    </div>
  </div>;
}
