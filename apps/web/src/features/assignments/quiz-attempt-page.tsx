import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { acceptsSubmissions, assignmentWindow } from "@/features/assignments/submission-window";
import { remainingAttempts } from "@/features/assignments/student/labels";
import { draftKeys, removeDraft } from "@/features/assignments/student/local-draft";
import { BackLink, PageError, PageNotice, PageSkeleton } from "@/features/assignments/student/page-states";
import { routeId, studentPaths } from "@/features/assignments/student/paths";
import { QuizRunner } from "@/features/assignments/student/quiz/quiz-runner";
import { useAssignmentDetails, useQuizAttempts } from "@/features/assignments/student/use-student-data";
import { useAuthStore } from "@/stores/auth";

/** `/me/classes/:classId/assignments/:assignmentId/attempt` — làm một lượt quiz (assessment-spec §8). */
export function QuizAttemptPage() {
  const { classId = "", assignmentId } = useParams();
  const id = routeId(assignmentId);
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const details = useAssignmentDetails(id);
  const isQuiz = details.data?.assignment.category === "quiz";
  const attempts = useQuizAttempts(id, isQuiz);
  const used = attempts.data?.length;
  const overview = studentPaths.overview(classId, assignmentId ?? "");
  const back = <BackLink to={overview}>Về trang bài</BackLink>;

  useEffect(() => {
    // Dọn nháp của các lượt đã nộp (ví dụ nộp thành công nhưng mất phản hồi).
    if (userId == null || used == null || !Number.isFinite(id)) return;
    for (let attemptNo = 1; attemptNo <= used; attemptNo += 1) removeDraft(draftKeys.quiz(userId, id, attemptNo));
  }, [userId, id, used]);

  if (!Number.isFinite(id)) return <PageNotice back={back} title="Không tìm thấy bài" description="Đường dẫn không hợp lệ." />;
  if (!details.data) {
    return details.isError ? <PageError back={back} error={details.error} onRetry={() => void details.refetch()} /> : <PageSkeleton />;
  }
  const item = details.data.assignment;
  const toOverview = <Button asChild variant="outline"><Link to={overview}>Về trang bài</Link></Button>;
  if (!isQuiz) return <PageNotice back={back} title="Bài này không phải quiz" description="Hãy làm từng câu ở trang tổng quan bài." action={toOverview} />;
  if (attempts.data == null || userId == null) {
    return attempts.isError ? <PageError back={back} error={attempts.error} onRetry={() => void attempts.refetch()} /> : <PageSkeleton />;
  }

  const window = assignmentWindow(item);
  const remaining = remainingAttempts(attempts.data.length, item.max_attempts);
  if (!acceptsSubmissions(window)) {
    return <PageNotice back={back} title={window === "upcoming" ? "Bài chưa mở" : "Bài đã đóng"}
      description="Hiện không thể bắt đầu lượt làm mới." action={toOverview} />;
  }
  if (remaining === 0) return <PageNotice back={back} title="Bạn đã dùng hết lượt làm bài" description="Xem kết quả các lượt ở trang tổng quan." action={toOverview} />;
  if (details.data.questions.length === 0) return <PageNotice back={back} title="Quiz chưa có câu hỏi" action={toOverview} />;

  const attemptNo = attempts.data.length + 1;
  return <QuizRunner key={attemptNo} details={details.data} attemptNo={attemptNo}
    draftKey={draftKeys.quiz(userId, id, attemptNo)} remainingAfter={remaining == null ? null : remaining - 1} />;
}
