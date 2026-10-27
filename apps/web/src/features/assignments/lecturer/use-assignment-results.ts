import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { isGrading } from "@/features/assignments/submission/submission-status";
import type { AssignmentDetails, AssignmentSubmission, Paginated, StudentResultRow } from "@/types/api";

const POLL_MS = 3000;

function itemsOf<T>(data: T[] | Paginated<T> | { items: T[] }): T[] {
  return Array.isArray(data) ? data : data.items;
}

/** Dữ liệu trang kết quả; tự làm mới mỗi 3 giây khi còn bài đang chờ/đang chấm. */
export function useAssignmentResults(assignmentId: number, enabled: boolean) {
  const details = useQuery({
    queryKey: queryKeys.assignments.details(assignmentId),
    queryFn: ({ signal }) => api.get<AssignmentDetails>(`/assignments/${assignmentId}`, undefined, signal),
    enabled,
  });
  const results = useQuery({
    queryKey: queryKeys.assignments.results(assignmentId),
    queryFn: async ({ signal }) => itemsOf(await api.get<StudentResultRow[] | { items: StudentResultRow[] }>(`/assignments/${assignmentId}/results`, undefined, signal)),
    enabled,
    refetchInterval: (query) => query.state.data?.some((row) => row.questions.some((q) => isGrading(q.last_status))) ? POLL_MS : false,
  });
  const submissions = useQuery({
    queryKey: queryKeys.assignments.submissions(assignmentId),
    queryFn: async ({ signal }) => itemsOf(await api.get<AssignmentSubmission[] | Paginated<AssignmentSubmission>>(`/assignments/${assignmentId}/submissions`, undefined, signal)),
    enabled,
    refetchInterval: (query) => query.state.data?.some((row) => isGrading(row.status)) ? POLL_MS : false,
  });
  const questions = [...(details.data?.questions ?? [])].sort((a, b) => a.position - b.position);
  const positionOf = new Map(questions.map((q, index) => [q.question_id, index + 1]));
  return { details, results, submissions, questions, positionOf };
}
