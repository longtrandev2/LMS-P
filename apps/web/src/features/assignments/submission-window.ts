import type { AssignmentSummary } from "@/types/api";
import { utcDateTimeMillis } from "@/lib/date-time";

export function assignmentWindow(item: AssignmentSummary): "upcoming" | "open" | "late" | "closed" {
  const now = Date.now();
  if (item.available_from && now < utcDateTimeMillis(item.available_from)) return "upcoming";
  if (now <= utcDateTimeMillis(item.due_at)) return "open";
  if (item.allow_late && item.late_due_at && now <= utcDateTimeMillis(item.late_due_at)) return "late";
  return "closed";
}
