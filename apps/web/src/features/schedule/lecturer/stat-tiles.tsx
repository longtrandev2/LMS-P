import {
  CalendarCheck, CalendarClock, CalendarDays, Clock, FileCheck2, UserCheck, UserX, type LucideIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { AttendanceSummary } from "@/types/api";

export type StatTone = "brand" | "success" | "warning" | "info" | "destructive" | "neutral";

const TONE: Record<StatTone, string> = {
  brand: "bg-brand-soft text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/12 text-warning",
  info: "bg-info/10 text-info",
  destructive: "bg-destructive/8 text-destructive",
  neutral: "bg-secondary text-muted-foreground",
};

export interface StatTile { key: string; label: string; value: number | string; tone: StatTone; icon: LucideIcon }

/** Hàng "Ô thống kê" (DESIGN.md §4, S-Link): ô tô nhạt theo ý nghĩa, icon + nhãn 13, số 24/600 cùng tông căn phải. */
export function StatTiles({ tiles, loading, className }: { tiles: StatTile[]; loading?: boolean; className?: string }) {
  return (
    <ul className={cn("grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7", className)} aria-busy={loading || undefined}>
      {tiles.map((tile) => (
        <li key={tile.key} className={cn("flex min-w-0 items-center justify-between gap-2 rounded-xl px-3 py-2.5 sm:flex-col sm:items-stretch sm:p-3.5", TONE[tile.tone])}>
          <span className="flex min-w-0 items-center gap-1.5">
            <tile.icon className="size-4 shrink-0" strokeWidth={1.9} aria-hidden />
            <span className="truncate text-[13px] text-foreground/80">{tile.label}</span>
          </span>
          {loading ? <Skeleton className="ml-auto h-7 w-10 bg-background/60" />
            : <span className="text-right text-xl leading-7 font-semibold tabular-nums sm:text-2xl">{tile.value}</span>}
        </li>
      ))}
    </ul>
  );
}

/** Ô thống kê điểm danh: các ô số buổi (tùy chọn) + có mặt / muộn / có phép / vắng. */
export function attendanceTiles(counts: Pick<AttendanceSummary, "present" | "late" | "excused" | "absent">, sessions?: {
  total: number; taken: number; unmarked: number; unmarkedLabel?: string;
}): StatTile[] {
  const head: StatTile[] = sessions ? [
    { key: "total", label: "Tổng số buổi", value: sessions.total, tone: "brand", icon: CalendarDays },
    { key: "taken", label: "Đã điểm danh", value: sessions.taken, tone: "brand", icon: CalendarCheck },
    { key: "unmarked", label: sessions.unmarkedLabel ?? "Chưa điểm danh", value: sessions.unmarked, tone: "neutral", icon: CalendarClock },
  ] : [];
  return [
    ...head,
    { key: "present", label: "Có mặt", value: counts.present, tone: "success", icon: UserCheck },
    { key: "late", label: "Muộn", value: counts.late, tone: "info", icon: Clock },
    { key: "excused", label: "Có phép", value: counts.excused, tone: "warning", icon: FileCheck2 },
    { key: "absent", label: "Vắng", value: counts.absent, tone: "destructive", icon: UserX },
  ];
}
