import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { AttendanceStatus, SessionAttendance } from "@/types/api";
import { useInvalidateSchedule } from "./use-schedule";

export interface DraftRecord { status: AttendanceStatus | null; note: string }
export type AttendanceDraft = Record<number, DraftRecord>;

/** GET /sessions/{id}/attendance — không tự refetch khi focus để không ghi đè bản nháp đang sửa. */
export function useSessionAttendance(sessionId: number) {
  return useQuery({
    queryKey: queryKeys.schedule.attendance(sessionId),
    queryFn: ({ signal }) => api.get<SessionAttendance>(`/sessions/${sessionId}/attendance`, undefined, signal),
    refetchOnWindowFocus: false,
    enabled: Number.isFinite(sessionId),
  });
}

/** PUT /sessions/{id}/attendance — chỉ gửi sinh viên đã có trạng thái. */
export function useSaveAttendance(classId: string, sessionId: number) {
  const invalidate = useInvalidateSchedule(classId);
  const client = useQueryClient();
  return useMutation({
    mutationFn: (draft: AttendanceDraft) => api.put<SessionAttendance>(`/sessions/${sessionId}/attendance`, {
      records: Object.entries(draft)
        .filter(([, r]) => r.status != null)
        .map(([id, r]) => ({ student_id: Number(id), status: r.status, note: r.note.trim() || null })),
    }),
    onSuccess: () => {
      void invalidate();
      void client.invalidateQueries({ queryKey: queryKeys.schedule.attendance(sessionId) });
    },
  });
}

export function draftFrom(data: SessionAttendance): AttendanceDraft {
  return Object.fromEntries(data.items.map((row) => [row.student_id, { status: row.status, note: row.note ?? "" }]));
}

export function isDraftDirty(draft: AttendanceDraft, baseline: AttendanceDraft): boolean {
  return Object.keys(draft).some((id) => {
    const a = draft[Number(id)], b = baseline[Number(id)];
    return !b || a.status !== b.status || a.note.trim() !== b.note.trim();
  });
}

export function countDraft(draft: AttendanceDraft) {
  const counts = { present: 0, late: 0, excused: 0, absent: 0, unmarked: 0 };
  for (const record of Object.values(draft)) {
    if (record.status) counts[record.status] += 1;
    else counts.unmarked += 1;
  }
  return counts;
}
