import { AlertTriangle, Check, CloudOff, Loader2, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { clockText, timeOfDay } from "../exam-labels";
import type { SaveStatus } from "./use-autosave";

const TONE = {
  normal: "bg-secondary text-foreground",
  warning: "bg-warning/14 text-warning",
  danger: "bg-destructive/10 text-destructive",
};

/**
 * Đồng hồ đếm ngược: xám bình thường, cam khi còn ≤ 5 phút, đỏ khi còn ≤ 1 phút. Trình đọc màn hình chỉ được báo
 * khi đổi mức (không đọc từng giây).
 */
export function Countdown({ seconds }: { seconds: number }) {
  const tone = seconds <= 60 ? "danger" : seconds <= 300 ? "warning" : "normal";
  const minutes = Math.ceil(seconds / 60);
  return <div className="flex items-center">
    <div role="timer" aria-label={`Thời gian còn lại khoảng ${minutes} phút`}
      className={cn("inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 transition-colors duration-150", TONE[tone])}>
      <Timer className="size-4" aria-hidden />
      <span className="font-mono text-[15px] font-semibold tabular-nums">{clockText(seconds)}</span>
    </div>
    <span className="sr-only" aria-live="assertive">
      {tone === "danger" ? "Còn dưới 1 phút. Hết giờ bài sẽ tự nộp." : tone === "warning" ? "Còn dưới 5 phút làm bài." : ""}
    </span>
  </div>;
}

/** Trạng thái lưu: "Đã lưu lúc hh:mm:ss" / "Đang lưu…" / "Mất kết nối — bài vẫn được giữ trên máy này". */
export function SaveStatusText({ status, dirty, className }: { status: SaveStatus; dirty: number; className?: string }) {
  let icon = <Check className="size-3.5" aria-hidden />;
  let text = "Bài làm được tự động lưu";
  let tone = "text-muted-foreground";
  if (status.kind === "offline") {
    icon = <CloudOff className="size-3.5" aria-hidden />;
    text = "Mất kết nối — bài vẫn được giữ trên máy này";
    tone = "text-warning";
  } else if (status.kind === "error") {
    icon = <AlertTriangle className="size-3.5" aria-hidden />;
    text = `Chưa lưu được — đang thử lại. ${status.message}`;
    tone = "text-destructive";
  } else if (status.kind === "saving" || dirty > 0) {
    icon = <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden />;
    text = "Đang lưu…";
  } else if (status.kind === "saved") {
    text = `Đã lưu lúc ${timeOfDay(status.at)}`;
  }
  return <p role="status" aria-live="polite" className={cn("flex min-w-0 items-center gap-1.5 text-xs", tone, className)}>
    {icon}<span className="truncate">{text}</span>
  </p>;
}
