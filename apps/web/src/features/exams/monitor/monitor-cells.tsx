import { Eye, Loader2 } from "lucide-react";
import { formatPoints } from "@/features/assignments/lecturer/labels";
import { cn } from "@/lib/utils";
import type { MonitorRow } from "@/types/exams";
import { agoLabel, countdown, serverMillis } from "./monitor-labels";

const muted = <span className="text-muted-foreground">—</span>;

/** Thời gian còn lại, đếm giữa hai lần poll theo giờ server ước lượng; cam khi < 5 phút, đỏ khi < 1 phút. */
export function RemainingCell({ row, serverNow }: { row: MonitorRow; serverNow: number }) {
  if (row.status !== "in_progress" || !row.ends_at) return muted;
  const seconds = Math.max(0, (serverMillis(row.ends_at) - serverNow) / 1000);
  if (seconds <= 0) return <span className="text-sm text-muted-foreground">Đang thu bài…</span>;
  return <span className={cn("font-mono text-sm font-medium tabular-nums", seconds < 300 && "text-warning", seconds < 60 && "text-destructive")}>
    {countdown(seconds)}
  </span>;
}

export function ProgressCell({ row }: { row: MonitorRow }) {
  if (row.status === "not_started" || row.question_count === 0) return muted;
  const percent = Math.round((row.answered_count / row.question_count) * 100);
  return <div className="flex min-w-24 flex-col gap-1">
    <span className="text-sm tabular-nums">{row.answered_count}/{row.question_count}<span className="text-muted-foreground"> câu</span></span>
    <span role="progressbar" aria-label={`Đã làm ${row.answered_count}/${row.question_count} câu`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}
      className="h-1 w-24 overflow-hidden rounded-full bg-secondary">
      <span className="block h-full rounded-full bg-foreground" style={{ width: `${percent}%` }} />
    </span>
  </div>;
}

export function FocusLostCell({ row }: { row: MonitorRow }) {
  if (row.status === "not_started") return muted;
  if (row.focus_lost_count === 0) return <span className="text-sm text-muted-foreground tabular-nums">0</span>;
  return <span className="inline-flex h-5 items-center gap-1 rounded-md bg-warning/14 px-1.5 text-xs font-medium text-warning tabular-nums">
    <Eye className="size-3" aria-hidden />{row.focus_lost_count} lần
  </span>;
}

/** Kết nối: chấm xanh khi heartbeat trong 45 giây (server tính `online`), xám khi mất; kèm "x giây trước". */
export function ConnectionCell({ row, serverNow }: { row: MonitorRow; serverNow: number }) {
  if (row.status !== "in_progress") return muted;
  const ago = row.last_seen_at ? agoLabel((serverNow - serverMillis(row.last_seen_at)) / 1000) : null;
  return <div className="flex items-start gap-2">
    <span aria-hidden className={cn("mt-1.5 size-2 shrink-0 rounded-full", row.online ? "bg-success" : "bg-muted-foreground/40")} />
    <div className="leading-tight">
      <p className={cn("text-sm", !row.online && "text-muted-foreground")}>{row.online ? "Trực tuyến" : "Mất kết nối"}</p>
      {ago ? <p className="text-xs text-muted-foreground tabular-nums">{ago}</p> : null}
    </div>
  </div>;
}

export function ScoreCell({ row }: { row: MonitorRow }) {
  if (row.status !== "submitted") return muted;
  if (row.grading_pending) {
    return <span className="inline-flex items-center gap-1.5 text-sm text-info">
      <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden />Đang chấm
    </span>;
  }
  if (row.score == null) return muted;
  return <span className="text-sm tabular-nums">
    <span className="font-semibold">{formatPoints(row.score)}</span>
    <span className="text-muted-foreground"> / {formatPoints(row.max_score)}</span>
  </span>;
}
