import { Link, useLocation } from "react-router-dom";
import { FileQuestion, History, Library, School, Users, type LucideIcon } from "lucide-react";
import { Logo } from "@/components/logo";
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
        { href: "/admin/users", label: "Người dùng", icon: Users },
        { href: "/admin/academics", label: "Học phần & lớp", icon: Library, match: ["/courses", "/classes"] },
        { href: "/admin/audit-logs", label: "Nhật ký kiểm toán", icon: History },
        ...(!isLecturer ? [QUESTION_BANK] : []),
      ],
    });
  }
  return groups;
}

const within = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

export function BrandMark() {
  return (
    <Link to="/" aria-label="LMS-P — trang chủ" className="flex h-14 shrink-0 items-center px-4 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
      <Logo size={24} />
    </Link>
  );
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useLocation().pathname;
  const groups = navFor(useAuthStore((s) => s.user));

  return (
    <nav aria-label="Điều hướng chính" className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-3">
      {groups.map((group) => (
        <div key={group.group} className="space-y-0.5">
          <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">{group.group}</p>
          {group.items.map((item) => {
            const active = within(pathname, item.href) || (item.match ?? []).some((p) => within(pathname, p));
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-8 items-center gap-2 rounded-md px-2 text-sm font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:inset-y-1.5 before:-left-3 before:w-0.5 before:rounded-r-full before:bg-cta"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className={cn("size-4 shrink-0", active ? "text-foreground" : "text-muted-foreground")} aria-hidden />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

/** Cuối sidebar: hàng tài khoản (hồ sơ / đăng xuất). */
export function SidebarAccount({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="shrink-0 border-t border-sidebar-border p-2">
      <UserMenu variant="row" onNavigate={onNavigate} />
    </div>
  );
}
