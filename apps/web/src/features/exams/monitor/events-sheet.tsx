import { History } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/state-blocks";
import { cn } from "@/lib/utils";
import type { MonitorRow, SessionEventView } from "@/types/exams";
import { MONITOR_STATUS_LABEL, SESSION_EVENT, SUBMIT_REASON_LABEL, eventTime, type EventTone } from "./monitor-labels";
import { useSessionEvents } from "./use-exam-monitor";

const DOT: Record<EventTone, string> = {
  neutral: "bg-muted-foreground/50",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
};

function eventDetail(event: SessionEventView): string | null {
  const detail = event.detail;
  if (!detail) return null;
  if (event.type === "extended") {
    const parts = [detail.minutes != null ? `+${String(detail.minutes)} phút` : null,
      detail.reason ? `Lý do: ${String(detail.reason)}` : null,
      // `by` có thể chỉ là id người thao tác — chỉ hiện khi là tên.
      typeof detail.by === "string" && !/^\d+$/.test(detail.by) ? `Bởi ${detail.by}` : null];
    return parts.filter(Boolean).join(" · ") || null;
  }
  if (detail.reason) return `Lý do: ${String(detail.reason)}`;
  return null;
}

/** Sheet dòng thời gian sự kiện của một phiên (exam-spec §5.5, §8.3). */
export function EventsSheet({ row, onClose }: { row: MonitorRow; onClose: () => void }) {
  const events = useSessionEvents(row.session_id);
  const lost = events.data?.filter((event) => event.type === "focus_lost").length ?? 0;
  return <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
    <SheetContent className="w-full gap-0 sm:max-w-md">
      <SheetHeader className="border-b">
        <SheetTitle>Sự kiện phiên làm bài</SheetTitle>
        <SheetDescription>
          {row.student_full_name} · <span className="font-mono">{row.student_code ?? `ID ${row.student_id}`}</span>
          {row.paper_code ? ` · Mã đề ${row.paper_code}` : ""}{row.attempt_no ? ` · Lượt ${row.attempt_no}` : ""}
        </SheetDescription>
        <p className="text-xs text-muted-foreground">
          {MONITOR_STATUS_LABEL[row.status]}{row.submit_reason ? ` (${SUBMIT_REASON_LABEL[row.submit_reason]})` : ""}
          {events.data ? ` · ${events.data.length} sự kiện · rời trang ${lost} lần` : ""}
        </p>
      </SheetHeader>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {events.isPending ? <div aria-busy="true" aria-label="Đang tải" className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
        </div> : null}
        {events.isError ? <ErrorState error={events.error} onRetry={() => void events.refetch()} /> : null}
        {events.data && events.data.length === 0 ? <EmptyState compact icon={History} title="Chưa có sự kiện nào" /> : null}
        {events.data?.length ? <ol className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[3.5px] before:w-px before:bg-border">
          {events.data.map((event, index) => {
            const meta = SESSION_EVENT[event.type] ?? { label: event.type, tone: "neutral" as const };
            const detail = eventDetail(event);
            return <li key={`${event.occurred_at}-${index}`} className="relative flex gap-3 pl-0">
              <span aria-hidden className={cn("relative mt-1.5 size-2 shrink-0 rounded-full ring-4 ring-popover", DOT[meta.tone])} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className={cn("text-sm font-medium", meta.tone === "warning" && "text-warning", meta.tone === "destructive" && "text-destructive")}>{meta.label}</p>
                  <time dateTime={event.occurred_at} className="shrink-0 text-xs text-muted-foreground tabular-nums">{eventTime(event.occurred_at)}</time>
                </div>
                {detail ? <p className="mt-0.5 text-[13px] text-muted-foreground">{detail}</p> : null}
              </div>
            </li>;
          })}
        </ol> : null}
      </div>
    </SheetContent>
  </Sheet>;
}
