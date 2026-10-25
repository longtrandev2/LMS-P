import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { BookOpen, GraduationCap, LayoutGrid, Users, History, UserRound, ListChecks } from "lucide-react";
import { Logo } from "@/components/logo";
import { hasRole, useAuthStore } from "@/stores/auth";
import { cn } from "@/lib/utils";
import type { CurrentUser } from "@/types/api";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

function navFor(user: CurrentUser | null): { group: string; items: NavItem[] }[] {
  const groups: { group: string; items: NavItem[] }[] = [];
  if (hasRole(user, "admin")) {
    groups.push({
      group: "Quản trị",
      items: [
        { href: "/admin/academics", label: "Học phần & phân công", icon: BookOpen },
        { href: "/admin/users", label: "Người dùng", icon: Users },
        { href: "/admin/audit-logs", label: "Nhật ký kiểm toán", icon: History },
        { href: "/questions", label: "Ngân hàng câu hỏi", icon: ListChecks },
      ],
    });
  }
  if (hasRole(user, "lecturer")) {
    groups.push({
      group: "Giảng dạy",
      items: [
        ...(!hasRole(user, "admin") ? [{ href: "/courses", label: "Lớp được giao", icon: BookOpen }] : []),
        { href: "/questions", label: "Ngân hàng câu hỏi", icon: ListChecks },
      ],
    });
  }
  if (hasRole(user, "student")) {
    groups.push({
      group: "Học tập",
      items: [
        { href: "/me/classes", label: "Lớp của tôi", icon: LayoutGrid },
      ],
    });
  }
  if (user) groups.push({ group: "Cá nhân", items: [{ href: "/me/profile", label: "Hồ sơ của tôi", icon: UserRound }] });
  return groups;
}

export function BrandMark() {
  return (
    <Link to="/" className="flex h-20 items-center border-b border-sidebar-border/70 px-6">
      <Logo size={36} caption="Hệ thống quản lý học tập" className="text-sidebar-foreground" />
    </Link>
  );
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useLocation().pathname;
  const user = useAuthStore((s) => s.user);
  const groups = navFor(user);

  return (
    <nav aria-label="Điều hướng chính" className="flex flex-1 flex-col gap-7 px-4 py-7">
      {groups.map((group) => (
        <div key={group.group} className="space-y-1">
          <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {group.group}
          </p>
          {group.items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-sidebar-ring",
                  active
                    ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground ring-1 ring-inset ring-sidebar-primary/10"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
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

export function SidebarFooterRole() {
  const user = useAuthStore((s) => s.user);
  const roleHint = hasRole(user, "student")
    ? "Sinh viên"
    : hasRole(user, "lecturer")
      ? "Giảng viên"
      : "Quản trị";
  return (
    <div className="mx-4 mb-5 flex items-center gap-3 rounded-xl border border-sidebar-border bg-sidebar-accent/30 p-3">
      <span className="grid size-9 place-items-center rounded-lg bg-sidebar-accent text-sidebar-primary"><GraduationCap className="size-5" aria-hidden /></span>
      <div><p className="text-sm font-semibold">{roleHint}</p><p className="text-xs text-muted-foreground">Không gian làm việc LMS-P</p></div>
    </div>
  );
}
