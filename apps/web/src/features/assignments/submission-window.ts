import type { AssignmentSummary } from "@/types/api";

export function assignmentWindow(item: AssignmentSummary): "upcoming" | "open" | "late" | "closed" {
  const now = Date.now();
  if (item.available_from && now < new Date(item.available_from).getTime()) return "upcoming";
  if (now <= new Date(item.due_at).getTime()) return "open";
  if (item.allow_late && item.late_due_at && now <= new Date(item.late_due_at).getTime()) return "late";
  return "closed";
}
