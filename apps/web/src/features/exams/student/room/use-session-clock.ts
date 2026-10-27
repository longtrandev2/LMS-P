import { useCallback, useEffect, useRef, useState } from "react";
import { serverMillis } from "../exam-labels";

interface ClockLike { server_now: string; ends_at: string; remaining_seconds: number }

/** Giờ kết thúc theo đồng hồ máy: `ends_at − server_now` cộng vào lúc nhận phản hồi (bù lệch đồng hồ, exam-spec §4). */
function localDeadline(clock: ClockLike, receivedAt: number): number {
  const ends = serverMillis(clock.ends_at);
  const now = serverMillis(clock.server_now);
  return Number.isFinite(ends) && Number.isFinite(now) ? receivedAt + (ends - now) : receivedAt + clock.remaining_seconds * 1000;
}

function offsetOf(clock: ClockLike, receivedAt: number): number {
  const now = serverMillis(clock.server_now);
  return Number.isFinite(now) ? now - receivedAt : 0;
}

const secondsLeft = (deadline: number) => Math.max(0, Math.ceil((deadline - Date.now()) / 1000));

/**
 * Đồng hồ đếm ngược của phiên: đếm cục bộ, hiệu chỉnh mỗi khi có `SessionClock` mới (lưu, heartbeat, sự kiện).
 * `onExpire` gọi một lần khi về 0 (gọi lại được nếu sau đó giảng viên gia hạn).
 */
export function useSessionClock(initial: ClockLike, onExpire: () => void) {
  const [start] = useState(() => {
    const at = Date.now();
    return { deadline: localDeadline(initial, at), offset: offsetOf(initial, at) };
  });
  const deadline = useRef(start.deadline);
  const offset = useRef(start.offset);
  const expired = useRef(false);
  const expireRef = useRef(onExpire);
  const [remaining, setRemaining] = useState(() => secondsLeft(start.deadline));

  useEffect(() => { expireRef.current = onExpire; });

  const tick = useCallback(() => {
    const left = secondsLeft(deadline.current);
    setRemaining(left);
    if (left > 0) expired.current = false;
    else if (!expired.current) {
      expired.current = true;
      expireRef.current();
    }
  }, []);

  const sync = useCallback((clock: ClockLike) => {
    const at = Date.now();
    deadline.current = localDeadline(clock, at);
    offset.current = offsetOf(clock, at);
    setRemaining(secondsLeft(deadline.current));
  }, []);

  useEffect(() => {
    const timer = window.setInterval(tick, 500);
    return () => window.clearInterval(timer);
  }, [tick]);

  /** Giờ server ước tính (ms) — đóng dấu thời gian cho bản sao trên máy. */
  const serverNow = useCallback(() => Date.now() + offset.current, []);
  return { remaining, sync, serverNow };
}
