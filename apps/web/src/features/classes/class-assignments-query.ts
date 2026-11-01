import { api } from "@/lib/api";
import { utcDateTimeMillis } from "@/lib/date-time";
import { queryKeys } from "@/lib/query-keys";
import type { AssignmentSummary, Paginated } from "@/types/api";

/**
 * `GET /classes/{id}/assignments` — cùng key + tham số với `AssignmentsSection`
 * để dùng chung cache (trang chủ, tab Tổng quan, tab Bài tập).
 */
export function classAssignmentsQuery(classId: string | number) {
  const id = String(classId);
  return {
    queryKey: queryKeys.assignments.class(id),
    queryFn: () => api.get<Paginated<AssignmentSummary>>(`/classes/${id}/assignments`, { page: 1, limit: 100 }),
  };
}

export type DeadlineState = "upcoming" | "open" | "late";
export interface Deadline {
  assignment: AssignmentSummary;
  state: DeadlineState;
  /** Mốc hạn hiệu lực (hạn chính, hoặc hạn nộp muộn khi đã quá hạn chính). */
  dueMs: number;
}

/** Bài đã xuất bản và chưa đóng, sắp theo hạn gần nhất. */
export function openDeadlines(items: AssignmentSummary[], now = Date.now()): Deadline[] {
  const result: Deadline[] = [];
  for (const assignment of items) {
    if (!assignment.is_published) continue;
    const due = utcDateTimeMillis(assignment.due_at);
    const lateDue = assignment.allow_late && assignment.late_due_at ? utcDateTimeMillis(assignment.late_due_at) : null;
    const from = assignment.available_from ? utcDateTimeMillis(assignment.available_from) : null;
    if (now <= due) result.push({ assignment, state: from != null && now < from ? "upcoming" : "open", dueMs: due });
    else if (lateDue != null && now <= lateDue) result.push({ assignment, state: "late", dueMs: lateDue });
  }
  return result.sort((a, b) => a.dueMs - b.dueMs);
}

/** "còn 3 giờ", "còn 2 ngày"… `urgent` khi còn dưới 24 giờ. */
export function remainingLabel(dueMs: number, now = Date.now()): { text: string; urgent: boolean } {
  const minutes = Math.max(0, Math.floor((dueMs - now) / 60_000));
  if (minutes < 60) return { text: `còn ${Math.max(1, minutes)} phút`, urgent: true };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { text: `còn ${hours} giờ`, urgent: true };
  return { text: `còn ${Math.floor(hours / 24)} ngày`, urgent: false };
}
