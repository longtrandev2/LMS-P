import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useNotifications } from "./use-notifications";
import { formatRelativeTime } from "./relative-time";
import type { NotificationItem } from "./types";

function NotificationRow({ notification, onRead }: { notification: NotificationItem; onRead: (id: number) => void }) {
  const unread = !notification.is_read;
  return (
    <li>
      <button
        type="button"
        onClick={() => unread && onRead(notification.id)}
        aria-label={unread ? `Đánh dấu đã đọc: ${notification.title}` : notification.title}
        className="flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left transition-colors outline-none hover:bg-secondary focus-visible:bg-secondary"
      >
        <span aria-hidden className={cn("mt-[7px] size-1.5 shrink-0 rounded-full", unread ? "bg-info" : "bg-transparent")} />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-3">
            <span className={cn("min-w-0 flex-1 truncate text-sm", unread ? "font-medium" : "text-muted-foreground")}>
              {notification.title}
            </span>
            <time dateTime={notification.created_at} className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {formatRelativeTime(notification.created_at)}
            </time>
          </span>
          {notification.body ? (
            <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{notification.body}</span>
          ) : null}
        </span>
      </button>
    </li>
  );
}

function Message({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground">
      <BellOff className="size-5" strokeWidth={1.75} aria-hidden />
      {children}
    </div>
  );
}

/** Chuông thông báo ở topbar — số chưa đọc + popover danh sách hàng gọn. */
export function NotificationsBell() {
  const { list, items, unreadCount, markRead, markAllRead } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={unreadCount > 0 ? `Thông báo, ${unreadCount} chưa đọc` : "Thông báo"} className="relative">
          <Bell aria-hidden />
          {unreadCount > 0 ? (
            <span className="absolute -top-0.5 -right-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-foreground px-1 text-[9px] leading-none font-semibold text-background ring-2 ring-background tabular-nums">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(23rem,calc(100vw-1.5rem))] p-0">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
          <h2 className="text-sm font-semibold">
            Thông báo
            {unreadCount > 0 ? <span className="ml-1.5 font-normal text-muted-foreground tabular-nums">{unreadCount} mới</span> : null}
          </h2>
          {unreadCount > 0 ? (
            <button
              type="button"
              disabled={markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              {markAllRead.isPending ? "Đang lưu…" : "Đánh dấu đã đọc"}
            </button>
          ) : null}
        </div>
        <div className="max-h-[26rem] overflow-y-auto p-1.5">
          {list.isPending ? (
            <div className="space-y-1 p-1" aria-busy="true" aria-label="Đang tải">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : list.isError ? (
            <Message>Không tải được thông báo. Đóng rồi mở lại để thử.</Message>
          ) : items.length === 0 ? (
            <Message>Bạn chưa có thông báo nào.</Message>
          ) : (
            <ul>
              {items.map((notification) => (
                <NotificationRow key={notification.id} notification={notification} onRead={(id) => markRead.mutate(id)} />
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
