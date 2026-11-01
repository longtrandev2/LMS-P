import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Paginated } from "@/types/api";
import type { AttemptSessionSummary, AttemptSessionView } from "@/types/exams";

/** `GET /me/attempt-sessions?assignment_id=` — phiên của tôi, mới nhất trước. */
export function useMySessions(assignmentId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.exams.mySessions(assignmentId),
    queryFn: async ({ signal }) => {
      const data = await api.get<AttemptSessionSummary[] | Paginated<AttemptSessionSummary>>(
        "/me/attempt-sessions", { assignment_id: assignmentId }, signal);
      return (Array.isArray(data) ? data : data.items).sort((a, b) => b.attempt_no - a.attempt_no);
    },
    enabled: enabled && Number.isFinite(assignmentId),
  });
}

/**
 * `GET /attempt-sessions/{id}` — đề + câu trả lời đã lưu. Không tự tải lại khi đổi tab (phòng thi chỉ dùng lần đọc đầu);
 * `pollWhileOpen` dùng ở màn "Đã nộp" khi đang chờ server thu bài.
 */
export function useSessionView(sessionId: number, pollWhileOpen = false) {
  return useQuery({
    queryKey: queryKeys.exams.session(sessionId),
    queryFn: ({ signal }) => api.get<AttemptSessionView>(`/attempt-sessions/${sessionId}`, undefined, signal),
    enabled: Number.isFinite(sessionId),
    // Đề vừa nhận từ "Bắt đầu" dùng ngay; vào lại phòng sau đó luôn đọc lại câu trả lời đã lưu.
    staleTime: 5_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: (query) => pollWhileOpen && query.state.data?.session.status !== "submitted" ? 2500 : false,
  });
}

/** `POST /assignments/{id}/sessions` — 201 phiên mới / 200 phiên đang làm; đưa sẵn đề vào cache phòng thi. */
export function useStartSession(assignmentId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (acceptRules: boolean) => api.post<AttemptSessionView>(`/assignments/${assignmentId}/sessions`, { accept_rules: acceptRules }),
    onSuccess: (view) => {
      client.setQueryData(queryKeys.exams.session(view.session.id), view);
      void client.invalidateQueries({ queryKey: queryKeys.exams.mySessions(assignmentId) });
    },
    onError: () => void client.invalidateQueries({ queryKey: queryKeys.exams.mySessions(assignmentId) }),
  });
}
