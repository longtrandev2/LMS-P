import { useContext, useEffect, useRef } from "react";
import { RealtimeContext, type RealtimeListener } from "./realtime-bus";

interface SubscribeOptions {
  /** false = tạm không nghe. */
  enabled?: boolean;
  /**
   * Gọi `onOpen` ngay khi đăng ký nếu socket đã mở — giữ hành vi cũ của các màn từng tự mở socket riêng
   * (đọc lại REST ngay khi bắt đầu nghe).
   */
  replayOpen?: boolean;
}

/** Nghe mọi frame + sự kiện (re)connect trên kết nối WS dùng chung. Handler mới nhất luôn được dùng, không đăng ký lại. */
export function useRealtimeEvents(listener: RealtimeListener, { enabled = true, replayOpen = false }: SubscribeOptions = {}) {
  const bus = useContext(RealtimeContext);
  const ref = useRef(listener);
  useEffect(() => { ref.current = listener; });

  useEffect(() => {
    if (!bus || !enabled) return;
    const unsubscribe = bus.subscribe({
      onMessage: (type, data) => ref.current.onMessage?.(type, data),
      onOpen: () => ref.current.onOpen?.(),
    });
    if (replayOpen && bus.connected) ref.current.onOpen?.();
    return unsubscribe;
  }, [bus, enabled, replayOpen]);
}

/** Nghe một loại tín hiệu (`type` khớp chính xác). */
export function useRealtime<T = unknown>(type: string, handler: (data: T) => void, enabled = true) {
  const ref = useRef(handler);
  useEffect(() => { ref.current = handler; });
  useRealtimeEvents({ onMessage: (received, data) => { if (received === type) ref.current(data as T); } }, { enabled });
}
