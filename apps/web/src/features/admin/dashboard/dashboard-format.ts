/** Định dạng hiển thị cho trang tổng quan quản trị. */

const WEEKDAY = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function parseDay(date: string): { y: number; m: number; d: number; weekday: number } {
  const [y, m, d] = date.split("-").map(Number);
  return { y, m, d, weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-10-27" → "27/10" (nhãn trục x). Ngày đã là giờ Việt Nam từ API. */
export function dayLabel(date: string): string {
  const { m, d } = parseDay(date);
  return `${pad(d)}/${pad(m)}`;
}

/** "2026-10-27" → "T3, 27/10/2026" (tiêu đề tooltip). */
export function dayTitle(date: string): string {
  const { y, m, d, weekday } = parseDay(date);
  return `${WEEKDAY[weekday]}, ${pad(d)}/${pad(m)}/${y}`;
}

/** ms → giây, 1 chữ số lẻ khi < 10 s ("2,5 s", "12 s"). */
export function formatSeconds(ms: number, withUnit = true): string {
  const s = ms / 1000;
  const text = s.toLocaleString("vi-VN", { maximumFractionDigits: s < 10 ? 1 : 0 });
  return withUnit ? `${text} s` : text;
}

/** Mốc thời gian client (ms) → "hh:mm" hoặc "hh:mm:ss". */
export function clockTime(timestamp: number, seconds = false): string {
  if (!timestamp) return "—";
  const t = new Date(timestamp);
  return `${pad(t.getHours())}:${pad(t.getMinutes())}${seconds ? `:${pad(t.getSeconds())}` : ""}`;
}

/** Nhãn tiếng Việt cho các hàng đợi RabbitMQ — admin-spec §3. */
const QUEUE_LABEL: Record<string, string> = {
  "q.grading": "Chấm bài",
  "q.grading.events": "Sự kiện chấm bài",
  "q.runs": "Chạy thử",
  "q.run.events": "Sự kiện chạy thử",
};

export function isDeadQueue(name: string): boolean {
  return name.endsWith(".dead");
}

export function queueLabel(name: string): string {
  const base = name.replace(/\.dead$/, "");
  const label = QUEUE_LABEL[base] ?? base;
  return isDeadQueue(name) ? `${label} (hàng lỗi)` : label;
}
