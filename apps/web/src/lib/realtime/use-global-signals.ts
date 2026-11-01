import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/stores/auth";
import { useRealtimeEvents } from "./use-realtime";

interface NotificationSignal { notification_id?: number; type?: string }
interface KickSignal { reason?: string }

/** Thông báo hệ thống/bảo trì có thể đi kèm thay đổi cấu hình công khai (banner bảo trì). */
const touchesSettings = (type: string | undefined) => type?.startsWith("system.") ?? false;

/**
 * Tín hiệu dùng chung cho mọi màn — message-contracts §6.1:
 * - `notification.created` → tải lại chuông thông báo
 * - `settings.changed` → tải lại `/settings/public`
 * - `auth.kick` → đăng xuất ngay lập tức, xóa session, điều hướng về /login kèm toast lý do
 */
export function useGlobalSignals() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const notifications = () => void client.invalidateQueries({ queryKey: queryKeys.notifications.list() });
  const settings = () => void client.invalidateQueries({ queryKey: queryKeys.admin.publicSettings });

  useRealtimeEvents({
    onMessage: (type, data) => {
      if (type === "auth.kick") {
        const payload = data as KickSignal | null | undefined;
        const reason = payload?.reason || "Phiên đăng nhập của bạn đã kết thúc.";
        useAuthStore.getState().clearSession();
        client.clear();
        toast.error(reason);
        navigate("/login", { replace: true });
        return;
      }
      if (type === "notification.created") {
        notifications();
        if (touchesSettings((data as NotificationSignal | null | undefined)?.type)) settings();
      } else if (type === "settings.changed") {
        settings();
      }
    },
    onOpen: () => {
      notifications();
      settings();
    },
  });
}