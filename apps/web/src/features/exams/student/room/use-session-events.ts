import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { ClientSessionEvent, SessionClock } from "@/types/exams";
import { isSessionEnded } from "../exam-labels";

const HEARTBEAT_MS = 20_000;
const COALESCE_MS = 1000;

/**
 * Sự kiện phiên (exam-spec §5.5): heartbeat 20 s; `focus_lost` khi ẩn tab hoặc cửa sổ mất focus (gộp trong 1 s),
 * `focus_back` khi quay lại; `offline` gửi bù kèm thời điểm của máy khi có mạng lại, rồi `online`.
 * Trả `warning` = số lần rời trang để hiện cảnh báo sau khi quay lại.
 */
export function useSessionEvents({ sessionId, onClock, onEnded }: {
  sessionId: number; onClock: (clock: SessionClock) => void; onEnded: () => void;
}) {
  const handlers = useRef({ onClock, onEnded });
  const away = useRef(false);
  const lastBack = useRef(0);
  const coalesced = useRef(false);
  const localCount = useRef(0);
  const lostCount = useRef<Promise<number | null>>(Promise.resolve(null));
  const offlineAt = useRef<string | null>(null);
  const [warning, setWarning] = useState<number | null>(null);

  useEffect(() => { handlers.current = { onClock, onEnded }; });

  const send = useCallback(async (type: ClientSessionEvent, detail?: Record<string, unknown>): Promise<SessionClock | null> => {
    try {
      const clock = await api.post<SessionClock>(`/attempt-sessions/${sessionId}/events`, detail ? { type, detail } : { type });
      handlers.current.onClock(clock);
      return clock;
    } catch (error) {
      // 429 (quá 60 sự kiện/phút) hay lỗi mạng: bỏ qua, heartbeat sau sẽ đồng bộ lại.
      if (isSessionEnded(error)) handlers.current.onEnded();
      return null;
    }
  }, [sessionId]);

  useEffect(() => {
    function lost() {
      if (away.current) return;
      away.current = true;
      // Rời rồi quay lại liên tục trong 1 s (blur + ẩn tab, chớp focus) tính là một lần.
      coalesced.current = Date.now() - lastBack.current < COALESCE_MS;
      if (coalesced.current) return;
      localCount.current += 1;
      lostCount.current = send("focus_lost").then((clock) => clock?.focus_lost_count ?? null);
    }
    function back() {
      if (!away.current || document.visibilityState === "hidden") return;
      away.current = false;
      lastBack.current = Date.now();
      if (coalesced.current) return;
      void send("focus_back");
      void lostCount.current.then((count) => setWarning(Math.max(count ?? 0, localCount.current)));
    }
    const onVisibility = () => (document.visibilityState === "hidden" ? lost() : back());
    function onOffline() { offlineAt.current ??= new Date().toISOString(); }
    function onOnline() {
      const at = offlineAt.current;
      offlineAt.current = null;
      void (at ? send("offline", { occurred_at: at }) : Promise.resolve(null)).then(() => send("online"));
    }
    const heartbeat = window.setInterval(() => { if (navigator.onLine) void send("heartbeat"); }, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", lost);
    window.addEventListener("focus", back);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", lost);
      window.removeEventListener("focus", back);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [send]);

  return { warning, dismissWarning: () => setWarning(null) };
}
