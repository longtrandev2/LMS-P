import { Clock, MapPin, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SessionView } from "@/types/api";
import { DAY_LABELS, DELIVERY_LABELS, MODE_LABELS, formatDayShort, formatHM, groupByDate } from "./schedule-utils";

/**
 * Lịch tuần dạng danh sách theo ngày (mobile <md) — thay cho grid,
 * hiển thị đầy đủ thông tin từng buổi không cần popover.
 */
export function DayScheduleList({
  sessions,
  todayIso,
}: {
  sessions: SessionView[];
  todayIso: string;
}) {
  const byDate = groupByDate(sessions);
  if (sessions.length === 0) return null;

  return (
    <div className="space-y-4 md:hidden">
      {[...byDate.entries()].map(([date, items]) => {
        const day = new Date(`${date}T00:00:00`);
        const isToday = date === todayIso;
        return (
          <Card key={date} className="gap-0 py-0">
            <CardContent className="p-0">
              <div
                className={cn(
                  "flex items-center justify-between border-b px-4 py-3",
                  isToday && "bg-cta/5"
                )}
              >
                <p className={cn("text-sm font-semibold", isToday && "text-cta")}>
                  {DAY_LABELS[(day.getDay() + 6) % 7]} · {formatDayShort(day)}
                </p>
                {isToday ? (
                  <Badge variant="outline" className="border-cta/25 bg-cta/10 text-cta">
                    Hôm nay
                  </Badge>
                ) : null}
              </div>
              <ul className="divide-y">
                {items.map((session) => (
                  <li key={session.id} className="space-y-1.5 px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "rounded-md px-1.5 py-0.5 font-mono text-xs font-semibold",
                          session.mode === "thuc_hanh"
                            ? "bg-cta text-cta-foreground"
                            : "bg-cta/10 text-cta"
                        )}
                      >
                        {session.class_code}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3.5" aria-hidden />
                        Tiết {session.period_start}–{session.period_end} ·{" "}
                        {formatHM(session.start_time)}–{formatHM(session.end_time)}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{session.class_name}</p>
                    {session.title ? (
                      <p className="text-xs text-muted-foreground">{session.title}</p>
                    ) : null}
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        {MODE_LABELS[session.mode]} · {DELIVERY_LABELS[session.delivery]}
                      </span>
                      {session.room ? (
                        <span className="flex items-center gap-1">
                          {session.delivery === "truc_tuyen" ? (
                            <Video className="size-3.5" aria-hidden />
                          ) : (
                            <MapPin className="size-3.5" aria-hidden />
                          )}
                          Phòng {session.room}
                        </span>
                      ) : null}
                    </p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
