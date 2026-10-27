import { BookOpenCheck, FileStack, MonitorPlay, Users, type LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/features/admin/charts/chart-scale";
import type { StatTone } from "@/features/schedule/lecturer/stat-tiles";
import { cn } from "@/lib/utils";
import type { StatsView } from "@/types/admin";

/** Cùng công thức tô với `StatTiles` (DESIGN.md §4 "Ô thống kê"), thêm dòng phân rã dưới số. */
const TONE: Record<StatTone, string> = {
  brand: "bg-brand-soft text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/12 text-warning",
  info: "bg-info/10 text-info",
  destructive: "bg-destructive/8 text-destructive",
  neutral: "bg-secondary text-muted-foreground",
};

interface Tile { key: string; label: string; value: number; hint?: React.ReactNode; tone: StatTone; icon: LucideIcon }

function tilesOf(totals: StatsView["totals"]): Tile[] {
  const { student, lecturer, admin, locked } = totals.users;
  return [
    {
      key: "users", label: "Người dùng", value: student + lecturer + admin, tone: "brand", icon: Users,
      hint: (
        <>
          {formatNumber(student)} sinh viên · {formatNumber(lecturer)} giảng viên · {formatNumber(admin)} admin
          {locked > 0 ? <> · <span className="text-destructive">{formatNumber(locked)} bị khóa</span></> : " · 0 bị khóa"}
        </>
      ),
    },
    { key: "classes", label: "Lớp đang học", value: totals.active_classes, tone: "neutral", icon: BookOpenCheck, hint: "Lớp ở trạng thái đang học" },
    { key: "today", label: "Bài nộp hôm nay", value: totals.submissions_today, tone: "info", icon: FileStack, hint: "Trắc nghiệm và code, theo giờ Việt Nam" },
    {
      key: "exams", label: "Phiên thi đang diễn ra", value: totals.sessions_in_progress,
      tone: totals.sessions_in_progress > 0 ? "warning" : "neutral", icon: MonitorPlay, hint: "Sinh viên đang làm bài thi",
    },
  ];
}

export function DashboardStatTiles({ totals }: { totals?: StatsView["totals"] }) {
  const tiles = totals ? tilesOf(totals) : null;
  if (!tiles) {
    return (
      <ul aria-busy="true" aria-label="Đang tải" className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <li key={i}><Skeleton className="h-[104px] rounded-xl" /></li>)}
      </ul>
    );
  }
  return (
    <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((tile) => (
        <li key={tile.key} className={cn("flex min-w-0 flex-col gap-1 rounded-xl p-3.5", TONE[tile.tone])}>
          <span className="flex min-w-0 items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5">
              <tile.icon className="size-4 shrink-0" strokeWidth={1.9} aria-hidden />
              <span className="truncate text-[13px] text-foreground/80">{tile.label}</span>
            </span>
            <span className="text-2xl leading-8 font-semibold tabular-nums">{formatNumber(tile.value)}</span>
          </span>
          {tile.hint ? <span className="text-xs leading-5 text-muted-foreground">{tile.hint}</span> : null}
        </li>
      ))}
    </ul>
  );
}
