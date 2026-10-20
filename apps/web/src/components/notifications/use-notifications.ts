"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Paginated } from "@/types/api";
import { NOTIFICATION_PAGE_LIMIT, type NotificationItem } from "./types";

/**
 * Danh sách thông báo + các mutation đánh dấu đã đọc (api-spec §9).
 * unreadCount tính trên trang đầu — WS notification.new sẽ invalidate để cập nhật.
 */
export function useNotifications() {
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: ({ signal }) =>
      api.get<Paginated<NotificationItem>>(
        "/notifications",
        { page: 1, limit: NOTIFICATION_PAGE_LIMIT },
        signal
      ),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list() });

  const markRead = useMutation({
    mutationFn: (id: number) => api.patch(`/notifications/${id}/read`),
    onSuccess: invalidate,
  });

  const markAllRead = useMutation({
    mutationFn: () => api.patch("/notifications/read-all"),
    onSuccess: invalidate,
  });

  const items = list.data?.items ?? [];
  const unreadCount = items.filter((n) => !n.is_read).length;

  return { list, items, unreadCount, markRead, markAllRead };
}
