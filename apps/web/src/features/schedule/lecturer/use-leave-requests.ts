import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { LeaveRequest, LeaveRequestStatus, Paginated } from "@/types/api";

/** GET /classes/{id}/leave-requests (giảng viên: mọi đơn, lọc `status`). */
export function useLeaveRequests(classId: string, status?: LeaveRequestStatus) {
  return useQuery({
    queryKey: queryKeys.schedule.leaveRequests(classId, status),
    queryFn: ({ signal }) => api.get<Paginated<LeaveRequest>>(`/classes/${classId}/leave-requests`, { status, page: 1, limit: 100 }, signal),
  });
}

/** Số đơn đang chờ — dùng cho nhãn tab. */
export function usePendingLeaveCount(classId: string, enabled = true) {
  const query = useQuery({
    queryKey: queryKeys.schedule.leaveRequests(classId, "pending"),
    queryFn: ({ signal }) => api.get<Paginated<LeaveRequest>>(`/classes/${classId}/leave-requests`, { status: "pending", page: 1, limit: 100 }, signal),
    enabled,
  });
  return query.data?.total ?? 0;
}

/** PATCH /leave-requests/{id}: duyệt → điểm danh buổi thành "có phép" nên làm mới thống kê và sổ điểm. */
export function useReviewLeaveRequest(classId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, note }: { id: number; status: "approved" | "rejected"; note: string }) =>
      api.patch<LeaveRequest>(`/leave-requests/${id}`, { status, review_note: note.trim() || null }),
    onSuccess: (request) => Promise.all([
      client.invalidateQueries({ queryKey: ["classes", classId, "leave-requests"] }),
      client.invalidateQueries({ queryKey: queryKeys.schedule.summary(classId) }),
      client.invalidateQueries({ queryKey: queryKeys.schedule.attendance(request.session_id) }),
      client.invalidateQueries({ queryKey: queryKeys.grades.gradebook(classId) }),
    ]),
  });
}

/** Tải minh chứng: GET /leave-requests/{id}/evidence → blob → lưu tệp. */
export async function downloadEvidence(request: Pick<LeaveRequest, "id" | "evidence_name">): Promise<void> {
  const { blob, filename } = await api.download(`/leave-requests/${request.id}/evidence`);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename ?? request.evidence_name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} KB`;
  return `${(size / 1024 / 1024).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} MB`;
}
