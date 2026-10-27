import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import type { SessionAnswerInput, SessionClock } from "@/types/exams";
import type { DraftAnswer } from "@/features/assignments/student/answers/answer-model";
import { isSessionEnded } from "../exam-labels";
import { updateBackup, type PendingItem } from "./local-backup";

export type SaveStatus =
  | { kind: "idle" } | { kind: "saving" } | { kind: "saved"; at: string } | { kind: "offline" } | { kind: "error"; message: string };

const DEBOUNCE_MS = 1500;
const INTERVAL_MS = 15_000;
const MAX_BATCH = 50;

interface Options {
  sessionId: number;
  initialPending: Map<number, PendingItem>;
  serverNow: () => number;
  onClock: (clock: SessionClock) => void;
  onEnded: () => void;
}

/**
 * Tự lưu (exam-spec §5.4): gộp thay đổi theo câu, lưu sau 1,5 s kể từ thay đổi cuối và mỗi 15 s nếu còn thay đổi;
 * mỗi lô ≤ 50 câu. Thay đổi chưa lưu nằm trong bản sao localStorage; mất mạng thì chờ `online` rồi gửi lại.
 */
export function useAutosave({ sessionId, initialPending, serverNow, onClock, onEnded }: Options) {
  const pending = useRef(initialPending);
  const inFlight = useRef(false);
  const stopped = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const handlers = useRef({ onClock, onEnded, serverNow });
  const [status, setStatus] = useState<SaveStatus>(() => typeof navigator !== "undefined" && !navigator.onLine ? { kind: "offline" } : { kind: "idle" });
  const [dirty, setDirty] = useState(initialPending.size);

  useEffect(() => { handlers.current = { onClock, onEnded, serverNow }; });

  const persist = useCallback(() => {
    updateBackup(sessionId, { pending: Object.fromEntries(pending.current) });
    setDirty(pending.current.size);
  }, [sessionId]);

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current);
    if (stopped.current || inFlight.current || pending.current.size === 0) return;
    if (!navigator.onLine) { setStatus({ kind: "offline" }); return; }
    const batch = [...pending.current.entries()].slice(0, MAX_BATCH);
    inFlight.current = true;
    setStatus({ kind: "saving" });
    let retrySoon = false;
    try {
      const clock = await api.put<SessionClock>(`/attempt-sessions/${sessionId}/answers`, { answers: batch.map(([, item]) => item.entry) });
      // Câu bị sửa tiếp trong lúc gửi vẫn ở lại hàng đợi (so sánh đúng đối tượng đã gửi).
      for (const [id, item] of batch) if (pending.current.get(id) === item) pending.current.delete(id);
      persist();
      handlers.current.onClock(clock);
      setStatus({ kind: "saved", at: clock.saved_at ?? clock.server_now });
      retrySoon = pending.current.size > 0;
    } catch (error) {
      if (isSessionEnded(error)) {
        stopped.current = true;
        handlers.current.onEnded();
      } else if (error instanceof ApiError && error.status === 400) {
        // Dữ liệu bị từ chối (ví dụ ngôn ngữ không hợp lệ) — bỏ lô này để không kẹt mãi.
        for (const [id, item] of batch) if (pending.current.get(id) === item) pending.current.delete(id);
        persist();
        setStatus({ kind: "error", message: errorText(error) });
      } else {
        setStatus(error instanceof ApiError ? { kind: "error", message: errorText(error) } : { kind: "offline" });
      }
    } finally {
      inFlight.current = false;
    }
    if (retrySoon && !stopped.current) timer.current = window.setTimeout(() => void flush(), DEBOUNCE_MS);
  }, [sessionId, persist]);

  /** Ghi nhận thay đổi của một câu (đè thay đổi trước đó của cùng câu). */
  const queue = useCallback((entry: SessionAnswerInput, draft?: DraftAnswer) => {
    pending.current.set(entry.question_id, { entry, draft, at: handlers.current.serverNow() });
    persist();
    window.clearTimeout(timer.current);
    if (!stopped.current) timer.current = window.setTimeout(() => void flush(), DEBOUNCE_MS);
  }, [flush, persist]);

  /** Lấy mọi thay đổi chưa lưu để gửi kèm "Nộp bài" và ngừng tự lưu; `resume()` nếu nộp thất bại. */
  const drain = useCallback((): SessionAnswerInput[] => {
    stopped.current = true;
    window.clearTimeout(timer.current);
    return [...pending.current.values()].map((item) => item.entry);
  }, []);
  const resume = useCallback(() => { stopped.current = false; }, []);

  useEffect(() => {
    const interval = window.setInterval(() => void flush(), INTERVAL_MS);
    const onOnline = () => { setStatus({ kind: "idle" }); void flush(); };
    const onOffline = () => setStatus({ kind: "offline" });
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    if (pending.current.size > 0) timer.current = window.setTimeout(() => void flush(), DEBOUNCE_MS);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timer.current);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [flush]);

  return { status, dirty, queue, drain, resume, flush };
}
