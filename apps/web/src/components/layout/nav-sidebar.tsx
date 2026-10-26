import { Link, useLocation } from "react-router-dom";
import {
  BookOpen,
  CalendarRange,
  History,
  Home,
  LayoutGrid,
  Bell,
  UserRound,
  Users,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { hasRole, useAuthStore } from "@/stores/auth";
import { cn } from "@/lib/utils";
import type { CurrentUser } from "@/types/api";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

/** Item chung cho mọi role — đã có trang thật, không dead link */
const SHARED_ITEMS: NavItem[] = [
  { href: "/me/notifications", label: "Thông báo", icon: Bell },
  { href: "/me/profile", label: "Hồ sơ", icon: UserRound },
];

/** Menu theo role — chỉ liệt kê route đã có trang; chưa có thì không render */
function navGroupsFor(user: CurrentUser | null): { group: string; items: NavItem[] }[] {
  const groups: { group: string; items: NavItem[] }[] = [];
  if (hasRole(user, "student")) {
    groups.push({
      group: "Học tập",
      items: [
        { href: "/me", label: "Trang chủ", icon: Home },
        { href: "/me/classes", label: "Lớp học", icon: LayoutGrid },
        { href: "/me/schedule", label: "Lịch học", icon: CalendarRange },
      ],
    });
  }
  if (hasRole(user, "admin")) {
    groups.push({
      group: "Quản trị",
      items: [
        { href: "/admin/users", label: "Người dùng", icon: Users },
        { href: "/admin/audit-logs", label: "Nhật ký", icon: History },
      ],
    });
  }
  if (hasRole(user, "lecturer") || hasRole(user, "admin")) {
    groups.push({
      group: "Giảng dạy",
      items: [{ href: "/courses", label: "Khóa học", icon: BookOpen }],
    });
  }
  groups.push({ group: "Tài khoản", items: SHARED_ITEMS });
  return groups;
}

/** Trang chi tiết không nằm trong menu — map tay cho tiêu đề header */
const DETAIL_TITLES: [string, string][] = [
  ["/courses/", "Khóa học"],
  ["/classes/", "Chi tiết lớp"],
  ["/me/classes/", "Lớp học"],
];

/** Tiêu đề trang cho header: khớp item menu dài nhất (tránh /me nuốt /me/classes) */
export function headerTitleFor(pathname: string, user: CurrentUser | null): string {
  const items = navGroupsFor(user).flatMap((group) => group.items);
  const matched = items
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
  if (matched) return matched.label;
  const detail = DETAIL_TITLES.find(([prefix]) => pathname.startsWith(prefix));
  return detail?.[1] ?? "LMS-P";
}

export function BrandMark() {
  return (
    <Link to="/" className="flex items-center border-b border-sidebar-border px-5 py-4">
      <Logo size={34} caption="Hệ thống quản lý học tập" className="text-sidebar-foreground" />
    </Link>
  );
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useLocation().pathname;
  const user = useAuthStore((s) => s.user);
  const groups = navGroupsFor(user);

  return (
    <nav aria-label="Điều hướng chính" className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
      {groups.map((group) => (
        <div key={group.group} className="space-y-1">
          <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/50">
            {group.group}
          </p>
          {group.items.map((item) => {
            // Khớp href dài nhất để /me không active khi đang ở /me/classes
            const active = isLongestMatch(pathname, item.href, groups);
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-200",
                  active
                    ? "bg-cta/10 font-medium text-cta"
                    : "text-sidebar-foreground/75 hover:bg-muted hover:text-foreground"
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-cta transition-opacity",
                    active ? "opacity-100" : "opacity-0"
                  )}
                />
                <item.icon className="size-4 shrink-0" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

/** Item active chỉ khi href của nó là match dài nhất trong mọi item (xử lý /me vs /me/…) */
function isLongestMatch(
  pathname: string,
  href: string,
  groups: { items: NavItem[] }[]
): boolean {
  const hits = pathname === href || pathname.startsWith(`${href}/`);
  if (!hits) return false;
  const all = groups.flatMap((group) => group.items.map((item) => item.href));
  return !all.some(
    (other) => other !== href && other.startsWith(`${href}/`) &&
      (pathname === other || pathname.startsWith(`${other}/`))
  );
}

export function SidebarFooterRole() {
  const user = useAuthStore((s) => s.user);
  const roleHint = hasRole(user, "student")
    ? "Sinh viên"
    : hasRole(user, "lecturer")
      ? "Giảng viên"
      : "Quản trị";
  return (
    <p className="px-5 py-4 text-xs text-sidebar-foreground/40">
      {roleHint} · LMS-P v1
    </p>
  );
}
