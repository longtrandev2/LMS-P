import { Link, useParams } from "react-router-dom";
import { EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hasRole, useAuthStore } from "@/stores/auth";
import { acceptsSubmissions, assignmentWindow } from "@/features/assignments/submission-window";
import { remainingAttempts } from "@/features/assignments/student/labels";
import { BackLink, PageError, PageNotice, PageSkeleton } from "@/features/assignments/student/page-states";
import { routeId, studentPaths } from "@/features/assignments/student/paths";
import { AttemptScoreCard } from "@/features/assignments/student/review/attempt-score-card";
import { ReviewNavigator } from "@/features/assignments/student/review/review-navigator";
import { ReviewQuestionCard, reviewState } from "@/features/assignments/student/review/review-question-card";
import { useAssignmentDetails, useAttemptReview, useQuizAttempts } from "@/features/assignments/student/use-student-data";

/** `/me/classes/:classId/assignments/:assignmentId/attempts/:attemptId` — kết quả + xem lại theo chính sách (§6, §8). */
export function AttemptReviewPage() {
  const { classId = "", assignmentId, attemptId } = useParams();
  const id = routeId(assignmentId);
  const user = useAuthStore((state) => state.user);
  const review = useAttemptReview(id, routeId(attemptId));
  const details = useAssignmentDetails(id);
  // Giảng viên/admin xem lượt của sinh viên: quay về trang kết quả, không có hành động của sinh viên.
  const isStaff = hasRole(user, "lecturer") || hasRole(user, "admin");
  const attempts = useQuizAttempts(id, !isStaff);
  const backTo = isStaff ? `/classes/${classId}/assignments/${assignmentId}/results` : studentPaths.overview(classId, assignmentId ?? "");
  const back = <BackLink to={backTo}>{isStaff ? "Kết quả bài" : details.data?.assignment.title ?? "Về trang bài"}</BackLink>;

  if (!Number.isFinite(id) || !Number.isFinite(routeId(attemptId))) return <PageNotice back={back} title="Không tìm thấy lượt làm" description="Đường dẫn không hợp lệ." />;
  if (!review.data) {
    return review.isError ? <PageError back={back} error={review.error} onRetry={() => void review.refetch()} /> : <PageSkeleton />;
  }

  const { attempt, questions, shows_answers: showsAnswers } = review.data;
  const available = review.data.review_available && questions.length > 0;
  const states = questions.map(reviewState);
  const count = (state: string) => states.filter((value) => value === state).length;
  const item = details.data?.assignment;
  const remaining = item && attempts.data ? remainingAttempts(attempts.data.length, item.max_attempts) : 0;
  const isSession = item?.delivery === "session";
  // Bài giao theo phiên chỉ có một lượt (kỳ thi) hoặc bắt đầu lượt mới từ trang thông tin (quiz có giờ).
  const canRetry = !isStaff && item != null && item.category === "quiz" && remaining !== 0 && acceptsSubmissions(assignmentWindow(item));

  const actions = <>
    <Button asChild variant="secondary"><Link to={backTo}>{isStaff ? "Kết quả bài" : "Về trang bài"}</Link></Button>
    {canRetry ? <Button asChild><Link to={isSession ? studentPaths.overview(classId, assignmentId ?? "") : studentPaths.attempt(classId, assignmentId ?? "")}>Làm lại</Link></Button> : null}
  </>;

  return <div className="space-y-10">
    {/* Breadcrumb trên cùng đi theo route của sinh viên — giảng viên cần đường về trang kết quả bài. */}
    <div className="space-y-4">
      {isStaff ? back : null}
      <AttemptScoreCard attempt={attempt} title={item?.title} fallbackMax={item?.total_points} reviewAvailable={review.data.review_available}
      counts={available ? { correct: count("correct"), partial: count("partial"), wrong: count("wrong") + count("blank"), pending: count("pending") } : null} actions={actions} />
    </div>
    {available ? <div className="grid items-start gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,1fr)_14rem]">
      <aside className="lg:sticky lg:top-20 lg:order-2"><ReviewNavigator states={states} /></aside>
      <div className="min-w-0 space-y-6 lg:order-1">
        {showsAnswers ? null : <p className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-3 text-sm text-muted-foreground">
          <EyeOff className="size-4" aria-hidden /> Giảng viên không hiển thị đáp án đúng và giải thích cho bài này.
        </p>}
        {questions.map((row, index) => <ReviewQuestionCard key={row.question.question_id} row={row} index={index} showsAnswers={showsAnswers} />)}
      </div>
    </div> : null}
  </div>;
}
