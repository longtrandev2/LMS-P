import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useRealtimeEvents } from "./use-realtime";

interface NotificationSignal { notification_id?: number; type?: string }

/** Thông báo hệ thống/bảo trì có thể đi kèm thay đổi cấu hình công khai (banner bảo trì). */
const touchesSettings = (type: string | undefined) => type?.startsWith("system.") ?? false;

/**
 * Tín hiệu dùng chung cho mọi màn — message-contracts §6.1: `notification.created` → tải lại chuông thông báo,
 * `settings.changed` → tải lại `/settings/public`. Kết nối lại → đọc lại cả hai (có thể đã lỡ tín hiệu).
 */
export function useGlobalSignals() {
  const client = useQueryClient();
  const notifications = () => void client.invalidateQueries({ queryKey: queryKeys.notifications.list() });
  const settings = () => void client.invalidateQueries({ queryKey: queryKeys.admin.publicSettings });
  useRealtimeEvents({
    onMessage: (type, data) => {
      if (type === "notification.created") {
        notifications();
        if (touchesSettings((data as NotificationSignal | null | undefined)?.type)) settings();
      } else if (type === "settings.changed") settings();
    },
    onOpen: () => {
      notifications();
      settings();
    },
  });
}
