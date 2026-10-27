import { Link, useLocation } from "react-router-dom";
import { Activity, FileQuestion, History, LayoutDashboard, Library, PanelLeftClose, PanelLeftOpen, School, Settings, Users, type LucideIcon } from "lucide-react";
import { UserMenu } from "@/components/user-menu";
import { hasRole, useAuthStore } from "@/stores/auth";
import { cn } from "@/lib/utils";
import type { CurrentUser } from "@/types/api";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Tiền tố đường dẫn cũng làm mục này active (vd. trang lớp con). */
  match?: string[];
  /** Chỉ sáng khi đúng đường dẫn (không gồm trang con). */
  exact?: boolean;
}
interface NavGroup { group: string; items: NavItem[] }

const QUESTION_BANK: NavItem = { href: "/questions", label: "Ngân hàng câu hỏi", icon: FileQuestion };

/** Nhóm điều hướng theo vai trò (DESIGN.md §4). */
function navFor(user: CurrentUser | null): NavGroup[] {
  const isAdmin = hasRole(user, "admin");
  const isLecturer = hasRole(user, "lecturer");
  const groups: NavGroup[] = [];
  if (hasRole(user, "student")) {
    groups.push({ group: "Học tập", items: [{ href: "/me/classes", label: "Lớp của tôi", icon: School }] });
  }
  if (isLecturer) {
    groups.push({
      group: "Giảng dạy",
      items: [
        ...(!isAdmin ? [{ href: "/courses", label: "Lớp phụ trách", icon: School, match: ["/classes"] }] : []),
        QUESTION_BANK,
      ],
    });
  }
  if (isAdmin) {
    groups.push({
      group: "Quản trị",
      items: [
        { href: "/admin", label: "Tổng quan", icon: LayoutDashboard, exact: true },
        { href: "/admin/users", label: "Người dùng", icon: Users },
        { href: "/admin/academics", label: "Học phần & lớp", icon: Library, match: ["/courses", "/classes"] },
        { href: "/admin/operations", label: "Vận hành", icon: Activity },
        { href: "/admin/settings", label: "Cấu hình", icon: Settings },
        { href: "/admin/audit-logs", label: "Nhật ký kiểm toán", icon: History },
        ...(!isLecturer ? [QUESTION_BANK] : []),
      ],
    });
  }
  return groups;
}

const within = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

/**
 * Sidebar kiểu Frappe LMS — DESIGN.md §4: đầu là workspace (logo + người dùng), mục đang chọn là ô trắng nổi,
 * cuối là nút thu gọn. `collapsed` chỉ hiện icon.
 */
export function Sidebar({ collapsed = false, onToggle, onNavigate }: {
  collapsed?: boolean; onToggle?: () => void; onNavigate?: () => void;
}) {
  const pathname = useLocation().pathname;
  const groups = navFor(useAuthStore((s) => s.user));
  const multipleGroups = groups.length > 1;

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 p-2"><UserMenu collapsed={collapsed} onNavigate={onNavigate} /></div>
      <nav aria-label="Điều hướng chính" className="flex flex-1 flex-col gap-4 overflow-y-auto px-2 py-2">
        {groups.map((group) => (
          <div key={group.group} className="space-y-0.5">
            {multipleGroups && !collapsed ? <p className="px-2 pb-1 text-xs text-muted-foreground">{group.group}</p> : null}
            {group.items.map((item) => {
              const active = item.exact ? pathname === item.href : within(pathname, item.href) || (item.match ?? []).some((p) => within(pathname, p));
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-8 items-center gap-2.5 rounded-md px-2 text-sm transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                    collapsed && "justify-center px-0",
                    active
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-accent"
                  )}
                >
                  <item.icon className={cn("size-4 shrink-0", active ? "text-sidebar-accent-foreground" : "text-muted-foreground")} aria-hidden />
                  {collapsed ? <span className="sr-only">{item.label}</span> : <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      {onToggle ? (
        <div className="shrink-0 p-2">
          <button type="button" onClick={onToggle} aria-label={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
            className={cn("flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring outline-none",
              collapsed && "justify-center px-0")}>
            {collapsed ? <PanelLeftOpen className="size-4" aria-hidden /> : <><PanelLeftClose className="size-4" aria-hidden /> Thu gọn</>}
          </button>
        </div>
      ) : null}
    </div>
  );
}
