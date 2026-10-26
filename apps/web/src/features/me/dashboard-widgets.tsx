import { Link } from "react-router-dom";
import { ArrowRight, Bell, CalendarRange, LayoutGrid } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/state-blocks";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/features/notifications/relative-time";
import type { NotificationItem } from "@/features/notifications/types";
import type { ClassSummary } from "@/types/api";
import { MyClassCard } from "@/features/me/my-class-card";

/** 3 tile truy cập nhanh dưới lời chào */
export function QuickTiles({ unreadCount }: { unreadCount: number }) {
  const tiles = [
    {
      to: "/me/classes",
      icon: LayoutGrid,
      title: "Lớp học",
      description: "Lớp đang ghi danh",
    },
    {
      to: "/me/schedule",
      icon: CalendarRange,
      title: "Lịch học",
      description: "Thời khóa biểu tuần",
    },
    {
      to: "/me/notifications",
      icon: Bell,
      title: "Thông báo",
      description: unreadCount > 0 ? `${unreadCount} chưa đọc` : "Không có mới",
      badge: unreadCount,
    },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {tiles.map((tile) => (
        <Link
          key={tile.to}
          to={tile.to}
          className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          <Card className="h-full gap-0 py-0 transition-colors duration-200 group-hover:border-cta/40">
            <CardContent className="flex items-center gap-4 p-5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-cta/10 text-cta">
                <tile.icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-heading text-base font-semibold">
                  {tile.title}
                  {tile.badge ? (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-cta px-1.5 text-xs leading-none font-semibold text-cta-foreground">
                      {tile.badge > 99 ? "99+" : tile.badge}
                    </span>
                  ) : null}
                </span>
                <span className="block truncate text-sm text-muted-foreground">
                  {tile.description}
                </span>
              </span>
              <ArrowRight
                className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden
              />
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

/** Widget "Thông báo mới" — 5 mục mới nhất, link sang trang đầy đủ */
export function RecentNotificationsWidget({
  notifications,
  isPending,
}: {
  notifications: NotificationItem[];
  isPending: boolean;
}) {
  const latest = notifications.slice(0, 5);
  return (
    <Card className="h-full gap-0 py-0">
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b px-5 py-3.5">
          <p className="font-heading text-sm font-semibold">Thông báo mới</p>
          <Link
            to="/me/notifications"
            className="text-xs font-medium text-cta hover:underline"
          >
            Xem tất cả
          </Link>
        </div>
        {isPending ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : latest.length === 0 ? (
          <EmptyState
            title="Chưa có thông báo"
            description="Các thông báo mới từ lớp học sẽ xuất hiện ở đây."
          />
        ) : (
          <ul className="divide-y">
            {latest.map((notification) => (
              <li
                key={notification.id}
                className={cn(
                  "flex items-start gap-2.5 px-5 py-3",
                  notification.is_read ? "opacity-70" : ""
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "mt-1.5 size-1.5 shrink-0 rounded-full",
                    notification.is_read ? "bg-transparent" : "bg-cta"
                  )}
                />
                <span className="min-w-0 flex-1 space-y-0.5">
                  <span className="flex items-baseline justify-between gap-2">
                    <span
                      className={cn(
                        "truncate text-sm",
                        notification.is_read ? "font-normal text-muted-foreground" : "font-semibold"
                      )}
                    >
                      {notification.title}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatRelativeTime(notification.created_at)}
                    </span>
                  </span>
                  {notification.body ? (
                    <span className="line-clamp-1 block text-xs text-muted-foreground">
                      {notification.body}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/** Widget "Lớp đang học" — card lớp, tối đa 6, dư thì xem tất cả */
export function MyClassesWidget({
  classes,
  isPending,
}: {
  classes: ClassSummary[] | undefined;
  isPending: boolean;
}) {
  const visible = classes?.slice(0, 6) ?? [];
  return (
    <Card className="h-full gap-0 py-0">
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b px-5 py-3.5">
          <p className="font-heading text-sm font-semibold">
            Lớp đang học
            {classes ? (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {classes.length} lớp
              </span>
            ) : null}
          </p>
          <Link to="/me/classes" className="text-xs font-medium text-cta hover:underline">
            Xem tất cả
          </Link>
        </div>
        {isPending ? (
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            title="Bạn chưa được ghi danh vào lớp nào"
            description="Hãy liên hệ giảng viên hoặc quản trị khoa để được thêm vào lớp học phần."
          />
        ) : (
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            {visible.map((clazz) => (
              <MyClassCard key={clazz.id} clazz={clazz} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
