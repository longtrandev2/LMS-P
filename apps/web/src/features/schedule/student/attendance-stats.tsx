import { AlertTriangle, CalendarDays, CircleCheck, CircleHelp, CircleX, Clock, FileCheck, type LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/state-blocks";
import { cn } from "@/lib/utils";
import type { AttendanceSummary } from "@/types/api";

interface Tile { key: keyof AttendanceSummary; label: string; icon: LucideIcon; tone: string }

/** DESIGN.md v3.1 "Ô thống kê": nền tô nhạt theo ý nghĩa, icon + số cùng tông. */
const TILES: Tile[] = [
  { key: "total", label: "Tổng số buổi học", icon: CalendarDays, tone: "bg-brand-soft text-primary" },
  { key: "present", label: "Có mặt", icon: CircleCheck, tone: "bg-success/10 text-success" },
  { key: "late", label: "Muộn / Về sớm", icon: Clock, tone: "bg-info/10 text-info" },
  { key: "excused", label: "Vắng có phép", icon: FileCheck, tone: "bg-warning/12 text-warning" },
  { key: "absent", label: "Vắng không phép", icon: CircleX, tone: "bg-destructive/8 text-destructive" },
  { key: "unmarked", label: "Chưa điểm danh", icon: CircleHelp, tone: "bg-secondary text-muted-foreground" },
];

function AbsenceNote({ summary }: { summary: AttendanceSummary }) {
  const used = summary.absent + summary.excused;
  const max = summary.max_absences;
  if (max == null) return null;
  const left = max - used;
  const over = summary.eligible === false || left < 0;
  const near = !over && left <= 2;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
      <p className="text-muted-foreground tabular-nums">
        Được nghỉ tối đa <span className="font-medium text-foreground">{max}</span> buổi · đã nghỉ{" "}
        <span className={cn("font-medium text-foreground", (over || near) && "text-warning", over && "text-destructive")}>{used}</span>
      </p>
      {over || near ? (
        <p role={over ? "alert" : undefined}
          className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium",
            over ? "bg-destructive/8 text-destructive" : "bg-warning/12 text-warning")}>
          <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
          {over ? "Bạn đã nghỉ quá số buổi cho phép — không đủ điều kiện dự thi."
            : left === 0 ? "Bạn đã dùng hết số buổi được nghỉ; nghỉ thêm sẽ không đủ điều kiện dự thi."
            : `Bạn chỉ còn được nghỉ ${left} buổi; vượt quá sẽ không đủ điều kiện dự thi.`}
        </p>
      ) : null}
    </div>
  );
}

/** Hàng 6 ô thống kê điểm danh của sinh viên (S-Link) + dòng giới hạn buổi nghỉ. */
export function AttendanceStats({ summary, loading, error, onRetry }: {
  summary?: AttendanceSummary; loading: boolean; error: unknown; onRetry: () => void;
}) {
  if (error && !summary) return <ErrorState error={error} onRetry={onRetry} className="py-8" />;
  return (
    <section aria-label="Thống kê điểm danh của bạn" className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {TILES.map((tile) => (
          <div key={tile.key} className={cn("flex min-h-[84px] flex-col justify-between gap-2 rounded-xl p-4", tile.tone)}>
            <div className="flex items-center gap-2">
              <tile.icon className="size-4 shrink-0" strokeWidth={1.9} aria-hidden />
              <span className="text-[13px] leading-tight font-medium text-foreground/80">{tile.label}</span>
            </div>
            {loading || !summary ? <Skeleton className="ml-auto h-7 w-10" />
              : <span className="text-right text-2xl leading-none font-semibold tabular-nums">{String(summary[tile.key] ?? 0)}</span>}
          </div>
        ))}
      </div>
      {summary ? <AbsenceNote summary={summary} /> : null}
    </section>
  );
}
