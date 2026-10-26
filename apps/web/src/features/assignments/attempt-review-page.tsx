import { useParams } from "react-router-dom";
import { EyeOff } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";
import { hasRole, useAuthStore } from "@/stores/auth";
import { BackLink, PageError, PageNotice, PageSkeleton } from "@/features/assignments/student/page-states";
import { routeId, studentPaths } from "@/features/assignments/student/paths";
import { AttemptScoreCard } from "@/features/assignments/student/review/attempt-score-card";
import {
  REVIEW_STATE_LABEL, REVIEW_STATE_TONE, ReviewQuestionCard, reviewState,
} from "@/features/assignments/student/review/review-question-card";
import { useAssignmentDetails, useAttemptReview } from "@/features/assignments/student/use-student-data";

/** `/me/classes/:classId/assignments/:assignmentId/attempts/:attemptId` — kết quả + xem lại theo chính sách (§6, §8). */
export function AttemptReviewPage() {
  const { classId = "", assignmentId, attemptId } = useParams();
  const id = routeId(assignmentId);
  const user = useAuthStore((state) => state.user);
  const review = useAttemptReview(id, routeId(attemptId));
  const details = useAssignmentDetails(id);
  // Giảng viên/admin xem lượt của sinh viên: quay về trang kết quả, không có hành động của sinh viên.
  const isStaff = hasRole(user, "lecturer") || hasRole(user, "admin");
  const back = isStaff
    ? <BackLink to={`/classes/${classId}/assignments/${assignmentId}/results`}>Kết quả bài</BackLink>
    : <BackLink to={studentPaths.overview(classId, assignmentId ?? "")}>{details.data?.assignment.title ?? "Về trang bài"}</BackLink>;

  if (!Number.isFinite(id) || !Number.isFinite(routeId(attemptId))) return <PageNotice back={back} title="Không tìm thấy lượt làm" description="Đường dẫn không hợp lệ." />;
  if (!review.data) {
    return review.isError ? <PageError back={back} error={review.error} onRetry={() => void review.refetch()} /> : <PageSkeleton />;
  }

  const { attempt, questions, shows_answers: showsAnswers } = review.data;
  const available = review.data.review_available && questions.length > 0;
  const states = questions.map(reviewState);
  const count = (state: string) => states.filter((value) => value === state).length;
  const summary = available ? `${count("correct")} đúng · ${count("partial")} một phần · ${count("wrong") + count("blank")} sai/bỏ trống` : undefined;

  return <div className="space-y-6">
    {back}
    <PageHeader title={`Kết quả lượt ${attempt.attempt_no}`} description={details.data?.assignment.title} />
    <AttemptScoreCard attempt={attempt} fallbackMax={details.data?.assignment.total_points} reviewAvailable={review.data.review_available} summary={summary} />
    {available ? <>
      <nav aria-label="Đi tới câu" className="flex flex-wrap gap-1.5">
        {states.map((state, index) => <a key={questions[index].question.question_id} href={`#cau-${index + 1}`}
          title={REVIEW_STATE_LABEL[state]} aria-label={`Câu ${index + 1}: ${REVIEW_STATE_LABEL[state]}`}
          className={cn("flex size-8 items-center justify-center rounded-md border text-xs font-medium tabular-nums outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background", REVIEW_STATE_TONE[state])}>
          {index + 1}
        </a>)}
      </nav>
      {showsAnswers ? null : <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <EyeOff className="size-4" aria-hidden /> Giảng viên không hiển thị đáp án đúng và giải thích cho bài này.
      </p>}
      <div className="space-y-4">
        {questions.map((row, index) => <ReviewQuestionCard key={row.question.question_id} row={row} index={index} showsAnswers={showsAnswers} />)}
      </div>
    </> : null}
  </div>;
}
