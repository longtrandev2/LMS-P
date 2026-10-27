import { utcDateTimeMillis } from "@/lib/date-time";
import type { MonitorStatus, SessionEventType, SubmitReason } from "@/types/exams";

/** Nhãn màn giám sát và kết quả bài giao theo phiên — docs/exam-spec.md §5.5, §5.6, §8.3. */
export const MONITOR_STATUS_LABEL: Record<MonitorStatus, string> = {
  not_started: "Chưa vào thi",
  in_progress: "Đang làm",
  submitted: "Đã nộp",
};

export const MONITOR_STATUS_BADGE: Record<MonitorStatus, "default" | "info" | "success"> = {
  not_started: "default",
  in_progress: "info",
  submitted: "success",
};

export const SUBMIT_REASON_LABEL: Record<SubmitReason, string> = {
  manual: "Tự nộp",
  timeout: "Hết giờ",
  forced: "Giảng viên thu",
};

export type EventTone = "neutral" | "info" | "success" | "warning" | "destructive";

export const SESSION_EVENT: Record<SessionEventType, { label: string; tone: EventTone }> = {
  heartbeat: { label: "Tín hiệu kết nối", tone: "neutral" },
  started: { label: "Bắt đầu làm bài", tone: "info" },
  resumed: { label: "Vào lại phòng thi", tone: "info" },
  focus_lost: { label: "Rời khỏi trang làm bài", tone: "warning" },
  focus_back: { label: "Quay lại trang làm bài", tone: "neutral" },
  offline: { label: "Mất kết nối mạng", tone: "destructive" },
  online: { label: "Có mạng trở lại", tone: "neutral" },
  submitted: { label: "Sinh viên nộp bài", tone: "success" },
  auto_submitted: { label: "Hệ thống thu bài (hết giờ)", tone: "success" },
  forced_submitted: { label: "Giảng viên thu bài", tone: "destructive" },
  extended: { label: "Gia hạn thời gian", tone: "info" },
};

/** Giờ server dạng UTC không múi giờ, có thể kèm phần lẻ nano giây — cắt còn mili giây trước khi parse. */
export function serverMillis(value: string): number {
  return utcDateTimeMillis(value.replace(/(\.\d{3})\d+/, "$1"));
}

const two = (n: number) => String(n).padStart(2, "0");

/** "hh:mm:ss" giờ máy. */
export function clockTime(ms: number): string {
  const date = new Date(ms);
  return `${two(date.getHours())}:${two(date.getMinutes())}:${two(date.getSeconds())}`;
}

/** "hh:mm:ss · dd/mm" cho dòng thời gian sự kiện. */
export function eventTime(value: string): string {
  const date = new Date(serverMillis(value));
  return `${clockTime(date.getTime())} · ${two(date.getDate())}/${two(date.getMonth() + 1)}`;
}

/** Đồng hồ đếm ngược "mm:ss" hoặc "h:mm:ss". */
export function countdown(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return h ? `${h}:${two(m)}:${two(total % 60)}` : `${two(m)}:${two(total % 60)}`;
}

export function agoLabel(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  if (s < 5) return "vừa xong";
  if (s < 60) return `${s} giây trước`;
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  return `${Math.floor(s / 86400)} ngày trước`;
}
