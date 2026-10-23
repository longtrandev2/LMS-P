import { useEffect, useRef } from "react";

/**
 * WebSocket client cho kênh push `/ws?token=` (api-spec §10).
 * Server-push only — client chỉ gửi {"type":"ping"} mỗi 30s (message-contracts §3).
 * Reconnect exponential backoff 1s→30s, reset khi kết nối thành công.
 */

interface WsEnvelope {
  type: string;
  ts: number;
  data?: unknown;
}

function wsUrl(token: string): string {
  const base = (import.meta.env.VITE_WS_URL ?? "ws://localhost:8000/ws").trim();
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}token=${encodeURIComponent(token)}`;
}

interface UseWebSocketOptions {
  /** Nhận mọi event server-push theo envelope {type, ts, data} */
  onMessage?: (type: string, data: unknown) => void;
}

export function useWebSocket(token: string | null, { onMessage }: UseWebSocketOptions = {}): void {
  // Giữ handler mới nhất trong ref — tránh reconnect khi component cha re-render
  const handlerRef = useRef(onMessage);

  useEffect(() => {
    handlerRef.current = onMessage;
  });

  useEffect(() => {
    if (!token) return;
    let ws: WebSocket | null = null;
    let attempts = 0;
    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let pingTimer: ReturnType<typeof setInterval> | undefined;

    const clearPing = () => {
      if (pingTimer !== undefined) clearInterval(pingTimer);
      pingTimer = undefined;
    };

    const scheduleReconnect = () => {
      if (disposed) return;
      const delay = Math.min(1000 * 2 ** attempts, 30_000);
      attempts += 1;
      reconnectTimer = setTimeout(connect, delay);
    };

    const connect = () => {
      ws = new WebSocket(wsUrl(token as string));
      ws.onopen = () => {
        attempts = 0;
        clearPing();
        pingTimer = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
        }, 30_000);
      };
      ws.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data as string) as WsEnvelope;
          if (msg?.type) handlerRef.current?.(msg.type, msg.data);
        } catch {
          /* frame không phải JSON — bỏ qua */
        }
      };
      ws.onclose = () => {
        clearPing();
        scheduleReconnect();
      };
      ws.onerror = () => {
        ws?.close();
      };
    };

    connect();

    return () => {
      disposed = true;
      clearTimeout(reconnectTimer);
      clearPing();
      ws?.close();
    };
  }, [token]);
}
