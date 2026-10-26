import type { CSSProperties } from "react";
import { MapPin, Video, Tag } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { SessionView } from "@/types/api";
import {
  DAY_LABELS,
  DELIVERY_LABELS,
  MODE_LABELS,
  PERIODS_PER_DAY,
  formatDayFull,
  formatDayShort,
  formatHM,
  periodTimeMap,
} from "./schedule-utils";

/** Số cột CSS grid: 1 cột nhãn tiết + 7 cột ngày */
const GRID_COLS = "3.5rem repeat(7, minmax(0, 1fr))";
/** Hàng: 1 hàng header + 12 hàng tiết (min 3rem để block 2 dòng text) */
const GRID_ROWS = `3rem repeat(${PERIODS_PER_DAY}, minmax(3rem, auto))`;

interface WeekScheduleGridProps {
  /** ISO Thứ 2 của tuần hiện xem */
  weekStart: string;
  sessions: SessionView[];
  todayIso: string;
}

/** Block một buổi học — đặt trực tiếp vào ô (cột ngày × hàng tiết) với row-span */
function SessionBlock({ session, dayIndex }: { session: SessionView; dayIndex: number }) {
  const isLab = session.mode === "thuc_hanh";
  const span = session.period_end - session.period_start + 1;
  const placement: CSSProperties = {
    gridColumn: dayIndex + 2,
    gridRow: `${session.period_start + 1} / ${session.period_end + 2}`,
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          style={placement}
          className={cn(
            "z-10 m-0.5 flex min-h-0 min-w-0 flex-col overflow-hidden rounded-md px-1.5 py-1 text-left transition-transform duration-150 hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cta",
            isLab
              ? "bg-cta text-cta-foreground"
              : "border border-cta/25 bg-cta/10 text-cta"
          )}
          aria-label={`${session.class_code} · ${session.class_name} · Tiết ${session.period_start}–${session.period_end}`}
        >
          <span className="truncate font-mono text-[11px] leading-tight font-semibold">
            {session.class_code}
          </span>
          <span className="truncate text-[10px] leading-tight opacity-90">
            {session.room ? `Phòng ${session.room}` : DELIVERY_LABELS[session.delivery]}
          </span>
          {span >= 3 ? (
            <span className="truncate text-[10px] leading-tight opacity-75">
              {session.class_name}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <p className="font-heading text-sm font-bold">{session.class_name}</p>
        <p className="mt-0.5 font-mono text-xs text-muted-foreground">{session.class_code}</p>
        <dl className="mt-3 space-y-1.5 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Ngày</dt>
            <dd className="text-right font-medium capitalize">{formatDayFull(session.session_date)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Tiết</dt>
            <dd className="font-medium">
              {session.period_start}–{session.period_end}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Giờ</dt>
            <dd className="font-medium tabular-nums">
              {formatHM(session.start_time)} – {formatHM(session.end_time)}
            </dd>
          </div>
          {session.room ? (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Phòng</dt>
              <dd className="font-medium">{session.room}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Hình thức</dt>
            <dd className="flex items-center gap-1.5 font-medium">
              {session.delivery === "truc_tuyen" ? (
                <Video className="size-3.5" aria-hidden />
              ) : (
                <MapPin className="size-3.5" aria-hidden />
              )}
              {MODE_LABELS[session.mode]} · {DELIVERY_LABELS[session.delivery]}
            </dd>
          </div>
          {session.title ? (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Chủ đề</dt>
              <dd className="flex items-center gap-1.5 text-right font-medium">
                <Tag className="size-3.5 shrink-0" aria-hidden />
                {session.title}
              </dd>
            </div>
          ) : null}
        </dl>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Grid lịch tuần desktop: cột Thứ 2→CN × hàng tiết 1..12.
 * Buổi học đặt bằng grid-column/row-span để một buổi vẽ liền mạch qua nhiều tiết.
 */
export function WeekScheduleGrid({ weekStart, sessions, todayIso }: WeekScheduleGridProps) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const monday = new Date(`${weekStart}T00:00:00`);
    monday.setDate(monday.getDate() + i);
    return {
      iso: `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`,
      label: DAY_LABELS[i],
      short: formatDayShort(monday),
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

        {/* Cột nhãn tiết + lưới ô trống làm nền kẻ ô; cột hôm nay phủ đỏ rất nhạt */}
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
        {days.map((day, dayIndex) =>
          Array.from({ length: PERIODS_PER_DAY }, (_, p) => (
            <div
              key={`cell-${day.iso}-${p + 1}`}
              className={cn(
                "border-r border-b last:border-r-0",
                day.iso === todayIso && "bg-cta/[0.04]"
              )}
              style={{ gridColumn: dayIndex + 2, gridRow: p + 2 }}
            />
          ))
        )}

        {/* Buổi học — đặt đè lên ô nền theo vị trí cột/ngày × hàng/tiết */}
        {sessions.map((session) => {
          const dayIndex = days.findIndex((day) => day.iso === session.session_date);
          if (dayIndex === -1) return null;
          return <SessionBlock key={session.id} session={session} dayIndex={dayIndex} />;
        })}
      </div>
    </div>
  );
}
