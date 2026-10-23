import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Paginated } from "@/types/api";
import { NOTIFICATION_PAGE_LIMIT, type NotificationItem } from "./types";

/** Danh sách thông báo và mutation đọc/đã đọc qua REST. */
export function useNotifications() {
  const queryClient = useQueryClient();
  const list = useQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: ({ signal }) => api.get<Paginated<NotificationItem>>(
      "/notifications", { page: 1, limit: NOTIFICATION_PAGE_LIMIT }, signal),
    refetchInterval: 30_000,
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list() });
  const markRead = useMutation({ mutationFn: (id: number) => api.patch(`/notifications/${id}/read`), onSuccess: invalidate });
  const markAllRead = useMutation({ mutationFn: () => api.patch("/notifications/read-all"), onSuccess: invalidate });
  const items = list.data?.items ?? [];
  return { list, items, unreadCount: items.filter((item) => !item.is_read).length, markRead, markAllRead };
}
