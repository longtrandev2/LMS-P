import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { AssignmentDetails, AssignmentSubmission, AttemptReview, Paginated, QuizAttempt, SubmissionDetails } from "@/types/api";
import { isGrading } from "../submission-result";

/** Route list có thể trả mảng hoặc trang `{items}` — chấp nhận cả hai. */
function asList<T>(data: T[] | Paginated<T>): T[] {
  return Array.isArray(data) ? data : data.items;
}

export function useAssignmentDetails(assignmentId: number) {
  return useQuery({
    queryKey: queryKeys.assignments.details(assignmentId),
    queryFn: ({ signal }) => api.get<AssignmentDetails>(`/assignments/${assignmentId}`, undefined, signal),
    enabled: Number.isFinite(assignmentId),
  });
}

export function useQuizAttempts(assignmentId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.assignments.quizAttempts(assignmentId),
    queryFn: async ({ signal }) => {
      const data = await api.get<QuizAttempt[] | Paginated<QuizAttempt>>(`/assignments/${assignmentId}/quiz-attempts`, undefined, signal);
      return asList(data).sort((a, b) => b.attempt_no - a.attempt_no);
    },
    enabled: enabled && Number.isFinite(assignmentId),
  });
}

/** `GET /me/submissions?assignment_id=` — lịch sử nộp từng câu của tôi. */
export function useMySubmissions(assignmentId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.assignments.mySubmissions(assignmentId),
    queryFn: async ({ signal }) => asList(await api.get<AssignmentSubmission[] | Paginated<AssignmentSubmission>>(
      "/me/submissions", { assignment_id: assignmentId, page: 1, limit: 100 }, signal)),
    enabled: enabled && Number.isFinite(assignmentId),
    // Bài code đang chấm: poll dự phòng khi WS lỡ event.
    refetchInterval: (query) => query.state.data?.some((item) => isGrading(item.status)) ? 4000 : false,
  });
}

export function useAttemptReview(assignmentId: number, attemptId: number) {
  return useQuery({
    queryKey: queryKeys.assignments.attemptReview(assignmentId, attemptId),
    queryFn: ({ signal }) => api.get<AttemptReview>(`/assignments/${assignmentId}/quiz-attempts/${attemptId}`, undefined, signal),
    enabled: Number.isFinite(assignmentId) && Number.isFinite(attemptId),
  });
}

/** Chi tiết một bài nộp; poll 2s khi đang chờ/đang chấm. */
export function useSubmissionDetails(submissionId: number | null) {
  return useQuery({
    queryKey: queryKeys.submissions.detail(submissionId ?? 0),
    queryFn: ({ signal }) => api.get<SubmissionDetails>(`/submissions/${submissionId}`, undefined, signal),
    enabled: submissionId != null,
    refetchInterval: (query) => isGrading(query.state.data?.status) ? 2000 : false,
  });
}
