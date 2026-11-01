import { useState, type ReactNode } from "react";
import { useWebSocket } from "@/lib/ws";
import { useAuthStore } from "@/stores/auth";
import { RealtimeBus, RealtimeContext } from "./realtime-bus";
import { useGlobalSignals } from "./use-global-signals";

function GlobalSignals() {
  useGlobalSignals();
  return null;
}

/**
 * Một kết nối WS dùng chung khi đã đăng nhập (message-contracts §6.1). Các màn đăng ký qua `useRealtime`/
 * `useRealtimeEvents`; dữ liệu luôn đọc lại qua REST, polling chậm vẫn giữ làm dự phòng.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [bus] = useState(() => new RealtimeBus());
  const token = useAuthStore((state) => state.accessToken);
  useWebSocket(token, {
    onMessage: (type, data) => bus.emit(type, data),
    onOpen: () => bus.open(),
    onClose: () => bus.close(),
  });
  return <RealtimeContext.Provider value={bus}>
    {token ? <GlobalSignals /> : null}
    {children}
  </RealtimeContext.Provider>;
}
