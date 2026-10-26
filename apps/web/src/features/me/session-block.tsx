import type { CSSProperties } from "react";
import { MapPin, Video, Tag } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { SessionView } from "@/types/api";
import { DELIVERY_LABELS, MODE_LABELS, formatDayFull, formatHM } from "./schedule-utils";

/** Chi tiết một buổi học trong popover: tên lớp, tiết, giờ, phòng, hình thức */
function SessionDetail({ session }: { session: SessionView }) {
  return (
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
  );
}

/**
 * Block một buổi học trên grid tuần: đặt vào ô (cột ngày × hàng tiết) với
 * row-span bằng số tiết; TH = đỏ đậm chữ trắng, LT = đỏ nhạt.
 */
export function SessionBlock({
  session,
  dayIndex,
}: {
  session: SessionView;
  dayIndex: number;
}) {
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
            session.mode === "thuc_hanh"
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
      <SessionDetail session={session} />
    </Popover>
  );
}
