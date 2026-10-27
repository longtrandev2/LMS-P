import { useCallback, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { AttemptSessionSummary, SessionAnswerInput } from "@/types/exams";
import { isSessionEnded } from "../exam-labels";
import { clearBackup } from "./local-backup";

const MAX_BATCH = 50;

/**
 * Nộp bài (exam-spec §5.6): gửi kèm mọi thay đổi chưa lưu trong body `finish` (quá 50 câu thì lưu bớt trước).
 * 409 `SESSION_ENDED` = quá giờ, server đã/đang thu bằng bài đã lưu → `onTimedOut`. Tự nộp khi hết giờ mà lỗi mạng
 * cũng coi như hết giờ (server tự thu trong vài giây).
 */
export function useFinish({ sessionId, drain, resume, onSubmitted, onTimedOut }: {
  sessionId: number; drain: () => SessionAnswerInput[]; resume: () => void;
  onSubmitted: (summary: AttemptSessionSummary) => void; onTimedOut: () => void;
}) {
  const running = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const finish = useCallback(async (auto: boolean) => {
    if (running.current) return;
    running.current = true;
    setPending(true);
    setError(null);
    const answers = drain();
    try {
      let rest = answers;
      while (rest.length > MAX_BATCH) {
        await api.put(`/attempt-sessions/${sessionId}/answers`, { answers: rest.slice(0, MAX_BATCH) });
        rest = rest.slice(MAX_BATCH);
      }
      const summary = await api.post<AttemptSessionSummary>(`/attempt-sessions/${sessionId}/finish`, rest.length ? { answers: rest } : {});
      clearBackup(sessionId);
      onSubmitted(summary);
    } catch (failure) {
      if (isSessionEnded(failure) || auto) {
        clearBackup(sessionId);
        onTimedOut();
      } else {
        resume();
        setError(failure);
        running.current = false;
      }
    } finally {
      setPending(false);
    }
  }, [sessionId, drain, resume, onSubmitted, onTimedOut]);

  return { finish, pending, error, reset: () => setError(null) };
}
