import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { AssignmentDetails } from "@/types/api";
import type { AttemptSessionSummary, MonitorTable, SessionEventView } from "@/types/exams";
import { serverMillis } from "./monitor-labels";
import { useMonitorSignals } from "./use-monitor-signals";

/** Polling dự phòng; cập nhật chính đến từ tín hiệu WS `exam.session_changed` (message-contracts §6.1). */
export const MONITOR_POLL_MS = 30_000;

export function useMonitorAssignment(assignmentId: number, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.assignments.details(assignmentId),
    queryFn: ({ signal }) => api.get<AssignmentDetails>(`/assignments/${assignmentId}`, undefined, signal),
    enabled: enabled && Number.isFinite(assignmentId),
  });
}

/** Bảng giám sát — tín hiệu WS + poll 30 giây; TanStack mặc định dừng poll khi tab ẩn và làm mới ngay khi quay lại. */
export function useMonitorTable(assignmentId: number, enabled: boolean) {
  useMonitorSignals(assignmentId, enabled);
  return useQuery({
    queryKey: queryKeys.exams.monitor(assignmentId),
    queryFn: ({ signal }) => api.get<MonitorTable>(`/assignments/${assignmentId}/sessions`, undefined, signal),
    enabled: enabled && Number.isFinite(assignmentId),
    // Lỗi nghiệp vụ (409 bài không giao theo phiên, 403, 404) thì thôi poll; lỗi mạng/5xx vẫn thử lại theo nhịp.
    refetchInterval: (query) => {
      const error = query.state.error;
      return error instanceof ApiError && error.status < 500 ? false : MONITOR_POLL_MS;
    },
    refetchIntervalInBackground: false,
  });
}

export function useSessionEvents(sessionId: number | null) {
  return useQuery({
    queryKey: queryKeys.exams.events(sessionId ?? 0),
    queryFn: ({ signal }) => api.get<SessionEventView[]>(`/attempt-sessions/${sessionId}/events`, undefined, signal),
    enabled: sessionId != null,
  });
}

/** Đồng hồ máy chạy mỗi giây, quy về giờ server nhờ độ lệch đo lúc nhận dữ liệu. */
export function useServerClock(serverNow: string | undefined, receivedAt: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const offset = serverNow ? serverMillis(serverNow) - receivedAt : 0;
  return now + offset;
}

export function useSessionActions(assignmentId: number) {
  const client = useQueryClient();
  const refresh = (sessionId: number) => Promise.all([
    client.invalidateQueries({ queryKey: queryKeys.exams.monitor(assignmentId) }),
    client.invalidateQueries({ queryKey: queryKeys.exams.events(sessionId) }),
    client.invalidateQueries({ queryKey: queryKeys.assignments.results(assignmentId) }),
  ]);
  const extend = useMutation({
    mutationFn: ({ sessionId, minutes, reason }: { sessionId: number; minutes: number; reason: string }) =>
      api.post<AttemptSessionSummary>(`/attempt-sessions/${sessionId}/extend`, { minutes, reason }),
    onSettled: (_data, _error, input) => refresh(input.sessionId),
  });
  const forceSubmit = useMutation({
    mutationFn: ({ sessionId, reason }: { sessionId: number; reason: string }) =>
      api.post<AttemptSessionSummary>(`/attempt-sessions/${sessionId}/force-submit`, { reason }),
    onSettled: (_data, _error, input) => refresh(input.sessionId),
  });
  return { extend, forceSubmit };
}
