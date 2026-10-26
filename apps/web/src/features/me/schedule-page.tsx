import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, ErrorState } from "@/components/state-blocks";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import type { SessionView } from "@/types/api";
import { DayScheduleList } from "./day-schedule-list";
import { WeekScheduleGrid } from "./week-schedule-grid";
import { addDays, formatDayShort, mondayOf, toIsoDate } from "./schedule-utils";

/** Lịch học tuần của sinh viên (FR-CRS-06): grid Thứ 2→CN × tiết 1..12, đổi tuần qua from/to */
export function SchedulePage() {
  const { status: guard } = useAuthGuard(["student"]);
  const [weekStart, setWeekStart] = useState(() => toIsoDate(mondayOf(new Date())));
  const todayIso = toIsoDate(new Date());

  const weekMonday = new Date(`${weekStart}T00:00:00`);
  const from = weekStart;
  const to = toIsoDate(addDays(weekMonday, 6));

  const query = useQuery({
    queryKey: queryKeys.me.schedule(from, to),
    queryFn: ({ signal }) => api.get<SessionView[]>("/me/schedule", { from, to }, signal),
    enabled: guard === "ok",
  });

  if (guard !== "ok") return null;

  const sessions = query.data ?? [];
  const isCurrentWeek = weekStart === toIsoDate(mondayOf(new Date()));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            Lịch học
          </h2>
          <p className="text-sm text-muted-foreground">
            Thời khóa biểu gộp các lớp bạn đang ghi danh.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Tuần trước"
            onClick={() => setWeekStart(toIsoDate(addDays(weekMonday, -7)))}
          >
            <ChevronLeft aria-hidden />
          </Button>
          <span className="min-w-40 text-center text-sm font-medium tabular-nums">
            {formatDayShort(weekMonday)} – {formatDayShort(addDays(weekMonday, 6))}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Tuần sau"
            onClick={() => setWeekStart(toIsoDate(addDays(weekMonday, 7)))}
          >
            <ChevronRight aria-hidden />
          </Button>
          {!isCurrentWeek ? (
            <Button variant="outline" size="sm" onClick={() => setWeekStart(toIsoDate(mondayOf(new Date())))}>
              <CalendarRange aria-hidden /> Tuần này
            </Button>
          ) : null}
        </div>
      </div>

      {query.isPending ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : query.isError ? (
        <Card>
          <CardContent className="p-0">
            <ErrorState error={query.error} onRetry={() => query.refetch()} />
          </CardContent>
        </Card>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              title="Không có buổi học nào trong tuần này"
              description="Thử chuyển sang tuần khác, hoặc liên hệ giảng viên nếu lịch chưa được cập nhật."
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden md:block">
            <WeekScheduleGrid weekStart={weekStart} sessions={sessions} todayIso={todayIso} />
          </div>
          <DayScheduleList sessions={sessions} todayIso={todayIso} />
        </>
      )}

      <p className="text-xs text-muted-foreground">
        Ô đỏ đậm: thực hành · Ô đỏ nhạt: lý thuyết. Nhấn vào buổi học để xem chi tiết.
      </p>
    </div>
  );
}
