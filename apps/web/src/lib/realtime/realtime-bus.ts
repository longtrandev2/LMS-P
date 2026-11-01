import { createContext } from "react";

/** Một người nghe trên kết nối WS dùng chung (message-contracts §6, §6.1). */
export interface RealtimeListener {
  /** Mọi frame server-push theo envelope `{type, ts, data}`. */
  onMessage?: (type: string, data: unknown) => void;
  /** Mỗi lần (re)connect thành công — đọc lại REST cho những gì có thể đã lỡ. */
  onOpen?: () => void;
}

/** Phân phối frame của một socket cho nhiều màn; giữ trạng thái đã kết nối để người đăng ký muộn biết. */
export class RealtimeBus {
  private listeners = new Set<RealtimeListener>();
  connected = false;

  subscribe(listener: RealtimeListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  emit(type: string, data: unknown): void {
    for (const listener of [...this.listeners]) {
      try { listener.onMessage?.(type, data); } catch { /* một màn lỗi không chặn màn khác */ }
    }
  }

  open(): void {
    this.connected = true;
    for (const listener of [...this.listeners]) {
      try { listener.onOpen?.(); } catch { /* bỏ qua */ }
    }
  }

  close(): void {
    this.connected = false;
  }
}

export const RealtimeContext = createContext<RealtimeBus | null>(null);
