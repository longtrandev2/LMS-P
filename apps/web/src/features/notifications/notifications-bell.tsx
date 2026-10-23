import { useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useNotifications } from "./use-notifications";
import { formatRelativeTime } from "./relative-time";
import type { NotificationItem } from "./types";

function NotificationRow({
  notification,
  onRead,
}: {
  notification: NotificationItem;
  onRead: (id: number) => void;
}) {
  const unread = !notification.is_read;
  return (
    <button
      type="button"
      onClick={() => unread && onRead(notification.id)}
      aria-label={unread ? `Đánh dấu đã đọc: ${notification.title}` : notification.title}
      className="flex w-full items-start gap-2.5 px-4 py-3 text-left transition-colors hover:bg-muted/60"
    >
      <span
        aria-hidden
        className={cn(
          "mt-1.5 size-1.5 shrink-0 rounded-full",
          unread ? "bg-cta" : "bg-transparent"
        )}
      />
      <span className="min-w-0 flex-1 space-y-0.5">
        <span className="flex items-baseline justify-between gap-2">
          <span
            className={cn(
              "truncate text-sm",
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
          <span className="line-clamp-2 block text-xs text-muted-foreground">
            {notification.body}
          </span>
        ) : null}
      </span>
    </button>
  );
}

/** Chuông thông báo ở header app-shell — badge số chưa đọc + dropdown danh sách */
export function NotificationsBell() {
  const { list, items, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Thông báo" className="relative">
          <Bell aria-hidden />
          {unreadCount > 0 ? (
            <span className="absolute top-0.5 right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-cta px-1 text-[10px] leading-none font-semibold text-cta-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-88 p-0">
        <div className="flex items-center justify-between gap-2 px-4 py-2.5">
          <DropdownMenuLabel className="p-0 text-sm font-semibold">Thông báo</DropdownMenuLabel>
          {unreadCount > 0 ? (
            <Button
              variant="ghost"
              size="xs"
              disabled={markAllRead.isPending}
              onClick={(e) => {
                e.preventDefault();
                markAllRead.mutate();
              }}
            >
              <CheckCheck aria-hidden />
              {markAllRead.isPending ? "Đang lưu…" : "Đọc tất cả"}
            </Button>
          ) : null}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <div className="max-h-96 overflow-y-auto">
          {list.isPending ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : list.isError ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Không tải được thông báo. Đóng rồi mở lại để thử.
            </p>
          ) : items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Bạn chưa có thông báo nào.
            </p>
          ) : (
            items.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                onRead={(id) => markRead.mutate(id)}
              />
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
