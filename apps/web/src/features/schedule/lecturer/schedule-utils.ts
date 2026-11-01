import type { SessionPattern } from "@/types/api";

/** Tiết 1–14 (class-schedule-grades-spec §2.1). */
export const PERIODS = Array.from({ length: 14 }, (_, i) => i + 1);
export const MAX_SESSIONS = 200;

function parseDate(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
}

/** Số buổi sẽ sinh: mỗi ngày trong [from, to] khớp thứ của một mẫu → một buổi (1 = Thứ 2 … 7 = CN). */
export function countGenerated(from: string, to: string, patterns: Pick<SessionPattern, "weekday">[]): number {
  const start = parseDate(from), end = parseDate(to);
  if (start == null || end == null || end < start) return 0;
  let count = 0;
  for (let t = start; t <= end; t += 86_400_000) {
    const day = new Date(t).getUTCDay();
    const weekday = day === 0 ? 7 : day;
    count += patterns.filter((p) => p.weekday === weekday).length;
  }
  return count;
}

/** Gợi ý mẫu tuần từ chuỗi lịch của lớp, ví dụ "T3 1-3, T5 1-3" → Thứ 3 tiết 1–3, Thứ 5 tiết 1–3. */
export function patternsFromSchedule(schedule?: string | null, room?: string | null): SessionPattern[] {
  const result: SessionPattern[] = [];
  for (const match of (schedule ?? "").matchAll(/(?:T|Thứ\s*)([2-7]|CN)\s*(?:\(|,|:)?\s*(?:tiết\s*)?(\d{1,2})\s*[-–]\s*(\d{1,2})/gi)) {
    const weekday = match[1].toUpperCase() === "CN" ? 7 : Number(match[1]) - 1;
    const startPeriod = Number(match[2]), endPeriod = Number(match[3]);
    if (startPeriod >= 1 && endPeriod <= 14 && startPeriod <= endPeriod) {
      result.push({ weekday, start_period: startPeriod, end_period: endPeriod, room: room ?? "", mode: "in_person" });
    }
  }
  return result.slice(0, 7);
}

/** `YYYY-MM-DD` theo giờ trình duyệt, cộng thêm `days`. */
export function isoDate(offsetDays = 0, base = new Date()): string {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
