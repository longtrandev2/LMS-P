import type { SessionView } from "@/types/api";

/** Số tiết tối đa mỗi ngày theo mô hình class_sessions (period 1..12) */
export const PERIODS_PER_DAY = 12;

export const DAY_LABELS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"] as const;

export const MODE_LABELS: Record<SessionView["mode"], string> = {
  ly_thuyet: "Lý thuyết",
  thuc_hanh: "Thực hành",
};

export const DELIVERY_LABELS: Record<SessionView["delivery"], string> = {
  truc_tiep: "Trực tiếp",
  truc_tuyen: "Trực tuyến",
};

/** Date → "yyyy-MM-dd" theo giờ local (tránh lệch ngày khi toISOString) */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Thứ 2 của tuần chứa date (getDay: 0=CN → lùi về thứ 2) */
export function mondayOf(date: Date): Date {
  const monday = new Date(date);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** 7 ngày (Thứ 2→CN) của tuần bắt đầu từ mondayIso */
export function weekDates(mondayIso: string): Date[] {
  const monday = new Date(`${mondayIso}T00:00:00`);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** "26/10" cho header cột ngày */
export function formatDayShort(date: Date): string {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** "Thứ 2, 26/10/2026" cho nhãn tuần và popover */
export function formatDayFull(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** "07:00" từ "07:00:00" */
export function formatHM(time?: string | null): string {
  return time ? time.slice(0, 5) : "—";
}

/** Map tiết → giờ bắt đầu/kết thúc suy ra từ dữ liệu buổi học trong tuần */
export function periodTimeMap(
  sessions: SessionView[]
): Map<number, { start?: string; end?: string }> {
  const map = new Map<number, { start?: string; end?: string }>();
  for (const session of sessions) {
    const head = map.get(session.period_start) ?? {};
    map.set(session.period_start, { ...head, start: session.start_time });
    const tail = map.get(session.period_end) ?? {};
    map.set(session.period_end, { ...tail, end: session.end_time });
  }
  return map;
}

/** Nhóm buổi học theo ngày (ISO) để render danh sách mobile */
export function groupByDate(sessions: SessionView[]): Map<string, SessionView[]> {
  const map = new Map<string, SessionView[]>();
  for (const session of sessions) {
    const list = map.get(session.session_date) ?? [];
    list.push(session);
    map.set(session.session_date, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.period_start - b.period_start);
  }
  return map;
}
