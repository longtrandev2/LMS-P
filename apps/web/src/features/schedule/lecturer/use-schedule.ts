import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { utcDateTimeMillis } from "@/lib/date-time";
import type { ClassAttendanceSummary, ClassSession, GenerateSessionsInput, SessionMode } from "@/types/api";

export interface SessionInput {
  date: string;
  start_period: number;
  end_period: number;
  room: string | null;
  mode: SessionMode;
  title: string | null;
  note: string | null;
}

/** GET /classes/{id}/sessions — tối đa 200 buổi, không phân trang (api-spec §11). */
export function useSessions(classId: string) {
  return useQuery({
    queryKey: queryKeys.schedule.sessions(classId),
    queryFn: ({ signal }) => api.get<{ items: ClassSession[] }>(`/classes/${classId}/sessions`, undefined, signal),
    select: (data) => data.items,
  });
}

/** GET /classes/{id}/attendance/summary — bản giảng viên (theo từng sinh viên). */
export function useClassAttendanceSummary(classId: string) {
  return useQuery({
    queryKey: queryKeys.schedule.summary(classId),
    queryFn: ({ signal }) => api.get<ClassAttendanceSummary>(`/classes/${classId}/attendance/summary`, undefined, signal),
  });
}

/** Làm mới mọi dữ liệu phụ thuộc lịch/điểm danh của lớp (buổi, thống kê, sổ điểm, học liệu gắn buổi). */
export function useInvalidateSchedule(classId: string) {
  const client = useQueryClient();
  return () => Promise.all([
    client.invalidateQueries({ queryKey: queryKeys.schedule.sessions(classId) }),
    client.invalidateQueries({ queryKey: queryKeys.schedule.summary(classId) }),
    client.invalidateQueries({ queryKey: queryKeys.grades.gradebook(classId) }),
    client.invalidateQueries({ queryKey: queryKeys.materials.list(classId) }),
  ]);
}

export function useScheduleMutations(classId: string) {
  const invalidate = useInvalidateSchedule(classId);
  const done = { onSuccess: () => { void invalidate(); } };
  return {
    generate: useMutation({
      mutationFn: (input: GenerateSessionsInput) =>
        api.post<{ created: number; removed: number }>(`/classes/${classId}/sessions/generate`, input),
      ...done,
    }),
    save: useMutation({
      mutationFn: ({ id, input }: { id?: number; input: SessionInput }) => id
        ? api.patch<ClassSession>(`/sessions/${id}`, input)
        : api.post<ClassSession>(`/classes/${classId}/sessions`, input),
    }),
    setCancelled: useMutation({
      mutationFn: ({ id, cancelled }: { id: number; cancelled: boolean }) =>
        api.patch<ClassSession>(`/sessions/${id}`, { is_cancelled: cancelled }),
      ...done,
    }),
    remove: useMutation({ mutationFn: (id: number) => api.delete(`/sessions/${id}`), ...done }),
    /** Gắn/gỡ học liệu của lớp vào buổi: PATCH /materials/{id} `session_id` (null = gỡ). */
    linkMaterials: useMutation({
      mutationFn: (changes: { materialId: number; sessionId: number | null }[]) =>
        Promise.all(changes.map((c) => api.patch(`/materials/${c.materialId}`, { session_id: c.sessionId }))),
    }),
    invalidate,
  };
}

/** Trạng thái hiển thị của một buổi trong bảng. */
export type SessionState = "cancelled" | "taken" | "upcoming" | "unmarked";
export function sessionState(session: ClassSession, now = Date.now()): SessionState {
  if (session.is_cancelled) return "cancelled";
  if (session.attendance_taken_at) return "taken";
  return utcDateTimeMillis(session.starts_at) > now ? "upcoming" : "unmarked";
}


/** Buổi gần thời điểm hiện tại nhất (không tính buổi hủy). */
export function nearestSession(sessions: ClassSession[], now = Date.now()): ClassSession | undefined {
  let best: ClassSession | undefined;
  for (const session of sessions) {
    if (session.is_cancelled) continue;
    if (!best || Math.abs(utcDateTimeMillis(session.starts_at) - now) < Math.abs(utcDateTimeMillis(best.starts_at) - now)) best = session;
  }
  return best;
}
