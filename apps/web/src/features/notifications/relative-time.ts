import { utcDateTimeMillis } from "@/lib/date-time";

/**
 * Thời gian tương đối tiếng Việt: "vừa xong", "5 phút trước", … quá 7 ngày thì hiện ngày.
 * API trả thời điểm UTC không kèm múi giờ nên phải parse qua `utcDateTimeMillis`.
 */
export function formatRelativeTime(iso: string): string {
  const then = utcDateTimeMillis(iso);
  if (Number.isNaN(then)) return "";
  const seconds = Math.floor((Date.now() - then) / 1000);
  if (seconds < 60) return "vừa xong";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Date(then).toLocaleDateString("vi-VN");
}
