import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/stores/auth";
import { notificationHref } from "./notification-meta";
import { NotificationRow } from "./notification-row";
import { useNotifications } from "./use-notifications";
import type { NotificationItem } from "./types";

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
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  function openItem(notification: NotificationItem, href: string | null) {
    if (!notification.is_read) markRead.mutate(notification.id);
    if (href) { setOpen(false); navigate(href); }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
                <NotificationRow key={notification.id} notification={notification}
                  href={notificationHref(notification, user)} onOpen={openItem} />
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
