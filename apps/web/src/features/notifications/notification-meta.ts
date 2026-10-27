import {
  AlarmClock, Award, Bell, BookOpen, CalendarCheck, CalendarClock, CircleCheck, ClipboardList, FileText, Megaphone, type LucideIcon,
} from "lucide-react";
import type { CurrentUser } from "@/types/api";
import type { NotificationItem } from "./types";

/** Biểu tượng và nhãn ngắn (cho trình đọc màn hình) theo loại thông báo — admin-spec §8. */
const META: Record<string, { icon: LucideIcon; label: string }> = {
  "assignment.published": { icon: ClipboardList, label: "Bài tập mới" },
  "exam.published": { icon: FileText, label: "Kỳ thi mới" },
  "exam.upcoming": { icon: AlarmClock, label: "Sắp đến giờ thi" },
  "grade.released": { icon: Award, label: "Đã có kết quả" },
  "grade.updated": { icon: Award, label: "Điểm cập nhật" },
  "submission.graded": { icon: CircleCheck, label: "Đã chấm bài" },
  "material.created": { icon: BookOpen, label: "Học liệu mới" },
  "session.upcoming": { icon: CalendarClock, label: "Buổi học sắp tới" },
  "leave_request.created": { icon: CalendarCheck, label: "Đơn xin nghỉ" },
  "leave_request.reviewed": { icon: CalendarCheck, label: "Đơn xin nghỉ" },
  "system.announcement": { icon: Megaphone, label: "Thông báo hệ thống" },
};

export function notificationMeta(type: string): { icon: LucideIcon; label: string } {
  return META[type] ?? { icon: Bell, label: "Thông báo" };
}

const ASSIGNMENT_TYPES = new Set(["assignment.published", "exam.published", "exam.upcoming", "grade.released"]);

function idOf(data: NotificationItem["data"], key: string): number | null {
  const value = data?.[key];
  const id = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * Trang đích khi bấm thông báo; `null` = không điều hướng (thông báo hệ thống mở rộng tại chỗ).
 * Bài tập/kỳ thi: sinh viên → trang làm bài, giảng viên → trang kết quả.
 */
export function notificationHref(item: NotificationItem, user: CurrentUser | null): string | null {
  const roles = user?.roles ?? [];
  const student = roles.includes("student");
  const classId = idOf(item.data, "class_id");
  if (ASSIGNMENT_TYPES.has(item.type)) {
    const assignmentId = idOf(item.data, "assignment_id");
    if (!classId || !assignmentId) return null;
    if (student) return `/me/classes/${classId}/assignments/${assignmentId}`;
    if (roles.includes("lecturer") || roles.includes("admin")) return `/classes/${classId}/assignments/${assignmentId}/results`;
    return null;
  }
  if (item.type === "submission.graded") {
    const submissionId = idOf(item.data, "submission_id");
    return submissionId ? `/submissions/${submissionId}` : null;
  }
  if (!student || !classId) return null;
  if (item.type === "material.created") return `/me/classes/${classId}`;
  if (item.type === "grade.updated") return `/me/classes/${classId}?tab=grades`;
  if (item.type === "session.upcoming") return `/me/classes/${classId}?tab=schedule`;
  return null;
}
