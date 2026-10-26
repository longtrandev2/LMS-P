import { cn } from "@/lib/utils";
import type { SessionView } from "@/types/api";
import { SessionBlock } from "./session-block";
import {
  DAY_LABELS,
  PERIODS_PER_DAY,
  formatDayShort,
  formatHM,
  periodTimeMap,
  toIsoDate,
} from "./schedule-utils";

/** Số cột CSS grid: 1 cột nhãn tiết + 7 cột ngày */
const GRID_COLS = "3.5rem repeat(7, minmax(0, 1fr))";
/** Hàng: 1 hàng header + 12 hàng tiết (min 3rem để block chứa 2 dòng text) */
const GRID_ROWS = `3rem repeat(${PERIODS_PER_DAY}, minmax(3rem, auto))`;

interface WeekScheduleGridProps {
  /** ISO Thứ 2 của tuần hiện xem */
  weekStart: string;
  sessions: SessionView[];
  todayIso: string;
}

/**
 * Grid lịch tuần desktop: cột Thứ 2→CN × hàng tiết 1..12.
 * Buổi học đặt bằng grid-column/row-span để một buổi vẽ liền mạch qua nhiều tiết.
 */
export function WeekScheduleGrid({ weekStart, sessions, todayIso }: WeekScheduleGridProps) {
  const monday = new Date(`${weekStart}T00:00:00`);
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return {
      iso: toIsoDate(date),
      label: DAY_LABELS[i],
      short: formatDayShort(date),
    };
  });
  const times = periodTimeMap(sessions);

  return (
    <div
      role="grid"
      aria-label="Lịch tuần"
      className="overflow-x-auto rounded-xl border bg-card"
      style={{ minWidth: "48rem" }}
    >
      <div
        className="grid"
        style={{ gridTemplateColumns: GRID_COLS, gridTemplateRows: GRID_ROWS }}
      >
        {/* Ô góc + header 7 ngày — hôm nay highlight đỏ */}
        <div className="border-r border-b bg-muted/40" />
        {days.map((day) => (
          <div
            key={day.iso}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 border-r border-b px-1 py-1.5 last:border-r-0",
              day.iso === todayIso ? "bg-cta/10" : "bg-muted/40"
            )}
          >
            <span
              className={cn(
                "text-xs font-semibold",
                day.iso === todayIso ? "text-cta" : "text-foreground"
              )}
            >
              {day.label}
            </span>
            <span
              className={cn(
                "text-[10px] tabular-nums",
                day.iso === todayIso ? "font-semibold text-cta" : "text-muted-foreground"
              )}
            >
              {day.short}
            </span>
          </div>
        ))}

        {/* Cột nhãn tiết: "Tiết n · 07:00–07:45" — giờ suy ra từ dữ liệu buổi học */}
        {Array.from({ length: PERIODS_PER_DAY }, (_, p) => {
          const period = p + 1;
          const time = times.get(period);
          return (
            <div
              key={`label-${period}`}
              className="flex flex-col items-center justify-center border-r border-b bg-muted/20 px-1"
              style={{ gridColumn: 1, gridRow: period + 1 }}
            >
              <span className="text-xs font-medium">Tiết {period}</span>
              {time?.start ? (
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {formatHM(time.start)}
                  {time.end ? `–${formatHM(time.end)}` : ""}
                </span>
              ) : null}
            </div>
          );
        })}

        {/* Lưới ô trống làm nền kẻ ô; cột hôm nay phủ đỏ rất nhạt */}
        {days.map((day, dayIndex) =>
          Array.from({ length: PERIODS_PER_DAY }, (_, p) => (
            <div
              key={`cell-${day.iso}-${p + 1}`}
              className={cn("border-r border-b", day.iso === todayIso && "bg-cta/[0.04]")}
              style={{ gridColumn: dayIndex + 2, gridRow: p + 2 }}
            />
          ))
        )}

        {/* Buổi học — đặt đè lên nền theo (cột ngày, hàng tiết) */}
        {sessions.map((session) => {
          const dayIndex = days.findIndex((day) => day.iso === session.session_date);
          if (dayIndex === -1) return null;
          return <SessionBlock key={session.id} session={session} dayIndex={dayIndex} />;
        })}
      </div>
    </div>
  );
}
