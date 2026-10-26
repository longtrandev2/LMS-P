import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useNotifications } from "@/features/notifications/use-notifications";
import { useMyClasses } from "@/features/me/use-my-classes";
import {
  MyClassesWidget,
  QuickTiles,
  RecentNotificationsWidget,
} from "@/features/me/dashboard-widgets";

/** Dashboard sinh viên (/me): lời chào, tile nhanh, thông báo mới, lớp đang học */
export function DashboardPage() {
  const { status: guard, user } = useAuthGuard(["student"]);
  const ok = guard === "ok";
  const notifications = useNotifications();
  const classesQuery = useMyClasses(ok);

  if (!ok) return null;

  // "Thứ Hai, 26/10/2026" — locale vi-VN, dài nhất là weekday + ngày/tháng/năm
  const today = new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
          Xin chào, {user?.full_name}
        </h2>
        <p className="text-sm text-muted-foreground">Hôm nay là {today}.</p>
      </div>

      <QuickTiles unreadCount={notifications.unreadCount} />

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MyClassesWidget classes={classesQuery.data} isPending={classesQuery.isPending} />
        </div>
        <RecentNotificationsWidget
          notifications={notifications.items}
          isPending={notifications.list.isPending}
        />
      </div>
    </div>
  );
}
