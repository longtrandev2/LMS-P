import type { AssignmentSummary } from "@/types/api";
import { utcDateTimeMillis } from "@/lib/date-time";

export type AssignmentWindow = "upcoming" | "open" | "late" | "closed";

export function assignmentWindow(item: AssignmentSummary, now = Date.now()): AssignmentWindow {
  if (item.available_from && now < utcDateTimeMillis(item.available_from)) return "upcoming";
  if (now <= utcDateTimeMillis(item.due_at)) return "open";
  if (item.allow_late && item.late_due_at && now <= utcDateTimeMillis(item.late_due_at)) return "late";
  return "closed";
}

export const WINDOW_LABEL: Record<AssignmentWindow, string> = {
  upcoming: "Chưa mở",
  open: "Đang mở",
  late: "Đang nhận nộp muộn",
  closed: "Đã đóng",
};

/** Còn nhận bài (đúng hạn hoặc trong hạn muộn). */
export function acceptsSubmissions(window: AssignmentWindow): boolean {
  return window === "open" || window === "late";
}

/** Thời điểm "đóng" (assessment-spec §6): `late_due_at` nếu cho nộp muộn, ngược lại `due_at`. */
export function assignmentCloseAt(item: AssignmentSummary): string {
  return item.allow_late && item.late_due_at ? item.late_due_at : item.due_at;
}
