import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useRealtimeEvents } from "@/lib/realtime/use-realtime";

export const MONITOR_SIGNAL_DEBOUNCE_MS = 1000;

interface SessionChanged { assignment_id?: number }

/**
 * Tín hiệu `exam.session_changed` của bài đang giám sát → tải lại bảng (gộp 1 s) — message-contracts §6.1.
 * Kết nối lại → tải lại ngay vì có thể đã lỡ tín hiệu.
 */
export function useMonitorSignals(assignmentId: number, enabled: boolean) {
  const client = useQueryClient();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const reload = () => void client.invalidateQueries({ queryKey: queryKeys.exams.monitor(assignmentId) });

  useEffect(() => () => clearTimeout(timer.current), []);

  useRealtimeEvents({
    onMessage: (type, data) => {
      if (type !== "exam.session_changed") return;
      if (Number((data as SessionChanged | null | undefined)?.assignment_id) !== assignmentId) return;
      if (timer.current !== undefined) return;
      timer.current = setTimeout(() => {
        timer.current = undefined;
        reload();
      }, MONITOR_SIGNAL_DEBOUNCE_MS);
    },
    onOpen: reload,
  }, { enabled: enabled && Number.isFinite(assignmentId) });
}
