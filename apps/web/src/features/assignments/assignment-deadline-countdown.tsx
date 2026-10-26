import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import { formatUtcDateTime, utcDateTimeMillis } from "@/lib/date-time";
import type { AssignmentSummary } from "@/types/api";

export function AssignmentDeadlineCountdown({ assignment, deadline, status }: {
  assignment: AssignmentSummary; deadline: string; status: "upcoming" | "open" | "late" | "closed";
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    let timer = 0;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      const remaining = utcDateTimeMillis(deadline) - current;
      const delay = remaining > 0 ? (remaining % 1000) + 1 : 1000;
      timer = window.setTimeout(tick, delay);
    };
    tick();
    return () => window.clearTimeout(timer);
  }, [deadline]);
  const seconds = Math.max(0, Math.floor((utcDateTimeMillis(deadline) - now) / 1000));
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  const clock = [hours, minutes, remainder].map((value) => String(value).padStart(2, "0")).join(":");
  const label = status === "late" ? "Còn hạn nộp muộn" : status === "closed" ? "Đã đóng" : "Còn đến hạn nộp";

  return <div role="timer" aria-label={`${assignment.title}: ${label}, hạn ${formatUtcDateTime(deadline)}`} className="flex min-w-36 items-center gap-2 rounded-xl border bg-background px-3 py-2">
    <Clock3 className={`size-4 shrink-0 ${status === "late" ? "text-amber-600" : "text-primary"}`} aria-hidden />
    <div className="min-w-0"><p className="text-[11px] leading-4 text-muted-foreground">{label}</p>
      <p className="font-mono text-sm font-semibold tabular-nums">{status === "closed" ? "00:00:00" : `${days ? `${days} ngày ` : ""}${clock}`}</p>
    </div>
  </div>;
}
