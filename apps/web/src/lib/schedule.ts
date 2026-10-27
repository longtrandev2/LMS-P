import type { AttendanceStatus, LeaveRequestStatus, SessionMode } from "@/types/api";

/** Nhãn và màu dùng chung cho lịch học/điểm danh — docs/class-schedule-grades-spec.md §2–4. */
export const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  present: "Có mặt", late: "Muộn / về sớm", excused: "Vắng có phép", absent: "Vắng không phép",
};
/** Variant của `ui/badge` cho từng trạng thái; chưa điểm danh dùng `secondary`. */
export const ATTENDANCE_TONE: Record<AttendanceStatus, "success" | "warning" | "info" | "destructive"> = {
  present: "success", late: "warning", excused: "info", absent: "destructive",
};
export const LEAVE_STATUS_LABEL: Record<LeaveRequestStatus, string> = {
  pending: "Chờ duyệt", approved: "Đã duyệt", rejected: "Từ chối", cancelled: "Đã hủy",
};
export const LEAVE_STATUS_TONE: Record<LeaveRequestStatus, "warning" | "success" | "destructive" | "secondary"> = {
  pending: "warning", approved: "success", rejected: "destructive", cancelled: "secondary",
};
export const SESSION_MODE_LABEL: Record<SessionMode, string> = { in_person: "Trực tiếp", online: "Online" };
export const WEEKDAY_LABEL = ["", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

/** Tiết n (1–14) bắt đầu 06:00 + n giờ, dài 50 phút (spec §2.1). */
export function periodRange(startPeriod: number, endPeriod: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(6 + startPeriod)}:00 – ${pad(6 + endPeriod)}:50`;
}

/** "Thứ sáu, 14/08/2026" từ ngày lịch `YYYY-MM-DD`. */
export function sessionDateLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${weekday === 0 ? "Chủ nhật" : `Thứ ${weekday + 1}`}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}
