import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { utcDateTimeMillis } from "@/lib/date-time";
import { queryKeys } from "@/lib/query-keys";
import type { AttendanceSummary, ClassSession, LeaveRequest, Paginated } from "@/types/api";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Gửi đơn cho buổi chưa diễn ra hoặc đã diễn ra trong 7 ngày (class-schedule-grades-spec §4). */
export const LEAVE_WINDOW_MS = 7 * DAY_MS;

/** `GET /classes/{id}/sessions` — danh sách buổi kèm `my_status`, `my_leave_request` (≤ 200, không phân trang). */
export function useClassSessions(classId: string) {
  return useQuery({
    queryKey: queryKeys.schedule.sessions(classId),
    queryFn: async ({ signal }) => (await api.get<{ items: ClassSession[] }>(`/classes/${classId}/sessions`, undefined, signal)).items,
  });
}

/** `GET /classes/{id}/attendance/summary` — dạng của sinh viên (số liệu của chính mình). */
export function useMyAttendanceSummary(classId: string) {
  return useQuery({
    queryKey: queryKeys.schedule.summary(classId),
    queryFn: ({ signal }) => api.get<AttendanceSummary>(`/classes/${classId}/attendance/summary`, undefined, signal),
  });
}

/** `GET /classes/{id}/leave-requests` — sinh viên chỉ nhận đơn của mình. */
export function useMyLeaveRequests(classId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.schedule.leaveRequests(classId),
    queryFn: async ({ signal }) =>
      (await api.get<Paginated<LeaveRequest>>(`/classes/${classId}/leave-requests`, { page: 1, limit: 100 }, signal)).items,
    enabled,
  });
}

function useInvalidateSchedule(classId: string) {
  const queryClient = useQueryClient();
  return () => Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.schedule.sessions(classId) }),
    queryClient.invalidateQueries({ queryKey: ["classes", classId, "leave-requests"] }),
    queryClient.invalidateQueries({ queryKey: queryKeys.schedule.summary(classId) }),
  ]);
}

/** `POST /sessions/{id}/leave-requests` (multipart `reason`, `evidence`). */
export function useCreateLeaveRequest(classId: string) {
  const invalidate = useInvalidateSchedule(classId);
  return useMutation({
    mutationFn: ({ sessionId, reason, evidence }: { sessionId: number; reason: string; evidence: File }) => {
      const form = new FormData();
      form.append("reason", reason);
      form.append("evidence", evidence);
      return api.upload<LeaveRequest>(`/sessions/${sessionId}/leave-requests`, form);
    },
    onSuccess: invalidate,
  });
}

/** `PATCH /leave-requests/{id}` `{status: "cancelled"}` — chỉ khi đơn còn chờ duyệt. */
export function useCancelLeaveRequest(classId: string) {
  const invalidate = useInvalidateSchedule(classId);
  return useMutation({
    mutationFn: (id: number) => api.patch<LeaveRequest>(`/leave-requests/${id}`, { status: "cancelled" }),
    onSuccess: invalidate,
  });
}

/** Tải tệp minh chứng `GET /leave-requests/{id}/evidence`. */
export async function downloadEvidence(request: Pick<LeaveRequest, "id" | "evidence_name">): Promise<void> {
  const { blob, filename } = await api.download(`/leave-requests/${request.id}/evidence`);
  saveBlob(blob, filename ?? request.evidence_name);
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Buổi còn nhận đơn: chưa hủy, chưa quá 7 ngày sau khi kết thúc, chưa có đơn chờ/đã duyệt. */
export function canRequestLeave(session: ClassSession, now = Date.now()): boolean {
  if (session.is_cancelled) return false;
  const active = session.my_leave_request && ["pending", "approved"].includes(session.my_leave_request.status);
  return !active && now - utcDateTimeMillis(session.ends_at) <= LEAVE_WINDOW_MS;
}
