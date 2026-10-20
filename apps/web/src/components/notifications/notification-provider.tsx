"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useWebSocket } from "@/lib/ws";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/stores/auth";

interface IncomingNotification {
  title?: string;
  body?: string | null;
}

/**
 * Mở WS /ws khi có access token; nhận event notification.new (message-contracts §3)
 * → toast sonner + invalidate query danh sách thông báo. WS là kênh tối ưu, không phải
 * nguồn chân lý — dữ liệu luôn lấy qua REST.
 */
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  useWebSocket(accessToken, {
    onMessage(type, data) {
      if (type !== "notification.new") return;
      const notification = (data ?? {}) as IncomingNotification;
      toast(notification.title ?? "Bạn có thông báo mới", {
        description: notification.body ?? undefined,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list() });
    },
  });

  return <>{children}</>;
}
