import { useParams } from "react-router-dom";
import { MarkdownView } from "@/components/markdown-view";
import { AssignmentHeader } from "@/features/assignments/student/overview/assignment-header";
import { QuestionListSection } from "@/features/assignments/student/overview/question-list-section";
import { QuizAttemptsSection } from "@/features/assignments/student/overview/quiz-attempts-section";
import { QuizPanel } from "@/features/assignments/student/overview/quiz-panel";
import { WorkPanel } from "@/features/assignments/student/overview/work-panel";
import { BackLink, PageError, PageNotice, PageSkeleton } from "@/features/assignments/student/page-states";
import { routeId, studentPaths } from "@/features/assignments/student/paths";
import { useAssignmentDetails, useQuizAttempts } from "@/features/assignments/student/use-student-data";
import { SessionAssignmentOverview } from "@/features/exams/student/info/session-assignment-overview";

/**
 * `/me/classes/:classId/assignments/:assignmentId` — tổng quan bài của sinh viên (assessment-spec §8), bố cục như trang
 * batch của Frappe LMS: cột trái tiêu đề + hàng meta + mô tả + lịch sử lượt/danh sách câu; cột phải panel tóm tắt + hành động.
 */
export function StudentAssignmentPage() {
  const { classId = "", assignmentId } = useParams();
  const id = routeId(assignmentId);
  const details = useAssignmentDetails(id);
  const isSession = details.data?.assignment.delivery === "session";
  const isQuiz = details.data?.assignment.category === "quiz";
  const attempts = useQuizAttempts(id, isQuiz && !isSession);
  const back = <BackLink to={studentPaths.classPage(classId)}>Bài tập của lớp</BackLink>;

  if (!Number.isFinite(id)) return <PageNotice back={back} title="Không tìm thấy bài" description="Đường dẫn không hợp lệ." />;
  if (!details.data) {
    return details.isError ? <PageError back={back} error={details.error} onRetry={() => void details.refetch()} /> : <PageSkeleton />;
  }

  // Bài giao theo phiên (kỳ thi, quiz có giờ/mã đề): trang thông tin + phòng thi thay cho danh sách câu (exam-spec §8).
  if (isSession) return <SessionAssignmentOverview details={details.data} />;
  const item = details.data.assignment;
  return <div className="space-y-8">
    <AssignmentHeader item={item} />
    <div className="grid items-start gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="order-2 min-w-0 space-y-8 lg:order-1">
        {item.description?.trim() ? <MarkdownView source={item.description} className="max-w-prose text-[15px] leading-7" /> : null}
        {isQuiz
          ? <QuizAttemptsSection item={item} attempts={attempts.data ?? []} isPending={attempts.isPending}
              error={attempts.error} onRetry={() => void attempts.refetch()} />
          : <QuestionListSection details={details.data} />}
      </div>
      <aside className="order-1 lg:sticky lg:top-20 lg:order-2">
        {isQuiz ? <QuizPanel item={item} attempts={attempts.data ?? []} isPending={attempts.isPending} /> : <WorkPanel details={details.data} />}
      </aside>
    </div>
  </div>;
}
