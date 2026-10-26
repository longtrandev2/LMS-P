import { useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, ErrorState } from "@/components/state-blocks";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useNotifications } from "@/features/notifications/use-notifications";
import { formatRelativeTime } from "@/features/notifications/relative-time";
import { cn } from "@/lib/utils";
import type { NotificationItem } from "@/features/notifications/types";

type Filter = "all" | "unread";

function NotificationItemRow({
  notification,
  expanded,
  onToggle,
}: {
  notification: NotificationItem;
  expanded: boolean;
  onToggle: (item: NotificationItem) => void;
}) {
  const unread = !notification.is_read;
  return (
    <li className={cn("border-b last:border-b-0", unread ? "bg-cta/[0.03]" : "")}>
      <button
        type="button"
        onClick={() => onToggle(notification)}
        aria-expanded={expanded}
        className="flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/50"
      >
        <span
          aria-hidden
          className={cn(
            "mt-1.5 size-2 shrink-0 rounded-full",
            unread ? "bg-cta" : "border border-border bg-transparent"
          )}
        />
        <span className="min-w-0 flex-1 space-y-1">
          <span className="flex items-baseline justify-between gap-3">
            <span
              className={cn(
                "text-sm",
                unread ? "font-semibold" : "font-medium text-muted-foreground"
              )}
            >
              {notification.title}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatRelativeTime(notification.created_at)}
            </span>
          </span>
          {notification.body ? (
            <span
              className={cn(
                "block text-sm text-muted-foreground",
                expanded ? "" : "line-clamp-2"
              )}
            >
              {notification.body}
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
}

/** Trang thông báo đầy đủ: lọc Tất cả/Chưa đọc, nhấn đánh dấu đọc + mở rộng nội dung */
export function NotificationsPage() {
  const { status: guard } = useAuthGuard();
  const { list, items, unreadCount, markRead, markAllRead } = useNotifications();
  const [filter, setFilter] = useState<Filter>("all");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  if (guard !== "ok") return null;

  const visible = filter === "unread" ? items.filter((item) => !item.is_read) : items;

  function handleToggle(item: NotificationItem) {
    // Mở rộng nội dung đồng thời đánh dấu đã đọc
    if (!item.is_read) markRead.mutate(item.id);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            Thông báo
          </h2>
          <p className="text-sm text-muted-foreground">
            Thông báo từ hệ thống và các lớp học phần của bạn.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={unreadCount === 0 || markAllRead.isPending}
          onClick={() => markAllRead.mutate()}
        >
          <CheckCheck aria-hidden />
          {markAllRead.isPending ? "Đang lưu…" : "Đánh dấu tất cả đã đọc"}
        </Button>
      </div>

      <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
        <TabsList>
          <TabsTrigger value="all">Tất cả ({items.length})</TabsTrigger>
          <TabsTrigger value="unread">
            Chưa đọc{unreadCount > 0 ? ` (${unreadCount})` : ""}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          {list.isPending ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : list.isError ? (
            <ErrorState error={list.error} onRetry={() => list.refetch()} />
          ) : visible.length === 0 ? (
            <EmptyState
              title={filter === "unread" ? "Không có thông báo chưa đọc" : "Bạn chưa có thông báo nào"}
              description="Các thông báo mới sẽ xuất hiện ở đây và trên chuông ở góc trên phải."
            />
          ) : (
            <ul>
              {visible.map((item) => (
                <NotificationItemRow
                  key={item.id}
                  notification={item}
                  expanded={expandedIds.has(item.id)}
                  onToggle={handleToggle}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Bell className="size-3.5" aria-hidden />
        Nhấn vào một thông báo để xem toàn bộ nội dung và đánh dấu đã đọc.
      </p>
    </div>
  );
}
