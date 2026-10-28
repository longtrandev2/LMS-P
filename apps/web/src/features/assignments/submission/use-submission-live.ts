import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useRealtimeEvents } from "@/lib/realtime/use-realtime";
import { isGrading } from "./submission-status";
import type { AssignmentDetails, SubmissionDetails } from "@/types/api";

const POLL_MS = 2000;

/**
 * Chi tiết bài nộp, tự cập nhật khi `pending/grading`: poll 2 giây + WS `submission.*`
 * (WS chỉ gửi cho chủ bài; `onOpen` đọc lại REST sau khi kết nối lại — message-contracts §6).
 */
export function useSubmissionLive(submissionId: number, enabled: boolean) {
  const submission = useQuery({
    queryKey: queryKeys.submissions.detail(submissionId),
    queryFn: ({ signal }) => api.get<SubmissionDetails>(`/submissions/${submissionId}`, undefined, signal),
    enabled,
    refetchInterval: (query) => isGrading(query.state.data?.status) ? POLL_MS : false,
  });
  const grading = isGrading(submission.data?.status);
  useRealtimeEvents({
    onMessage: (type, data) => {
      const id = (data as { submission_id?: unknown } | null)?.submission_id;
      if (type.startsWith("submission.") && Number(id) === submissionId) void submission.refetch();
    },
    onOpen: () => { void submission.refetch(); },
  }, { enabled: enabled && grading, replayOpen: true });
  const assignmentId = submission.data?.assignment_id;
  const assignment = useQuery({
    queryKey: queryKeys.assignments.details(assignmentId ?? 0),
    queryFn: ({ signal }) => api.get<AssignmentDetails>(`/assignments/${assignmentId}`, undefined, signal),
    enabled: enabled && assignmentId != null,
    retry: false,
  });
  return { submission, assignment, grading };
}
