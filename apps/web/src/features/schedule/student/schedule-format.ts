import type { AttendanceStatus } from "@/types/api";

/**
 * Tông màu điểm danh phía sinh viên theo DESIGN.md v3.1 "Ô thống kê": muộn = info, có phép = warning.
 * (Lưu ý: `ATTENDANCE_TONE` trong lib đang để ngược — late=warning, excused=info.)
 */
export const ATTENDANCE_BADGE: Record<AttendanceStatus, "success" | "warning" | "info" | "destructive"> = {
  present: "success", late: "info", excused: "warning", absent: "destructive",
};

/** "Tiết 10–11" */
export function periodLabel(start: number, end: number): string {
  return start === end ? `Tiết ${start}` : `Tiết ${start}–${end}`;
}

/** "29/10/2026" từ ngày lịch `YYYY-MM-DD`. */
export function shortDate(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

/** "Thứ 5" từ ngày lịch `YYYY-MM-DD`. */
export function weekdayOf(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return day === 0 ? "Chủ nhật" : `Thứ ${day + 1}`;
}

/** Ngày giờ ngắn "27/10/2026 12:18" theo giờ địa phương từ mốc UTC không hậu tố. */
export function localDateTime(value: string): string {
  const hasZone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value);
  const date = new Date(hasZone ? value : `${value}Z`);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Bỏ dấu + chữ thường để tìm kiếm tiếng Việt. */
export function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
}
