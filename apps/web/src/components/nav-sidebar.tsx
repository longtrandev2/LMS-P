"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, GraduationCap, LayoutGrid, Network, Users } from "lucide-react";
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
      items: [{ href: "/admin/users", label: "Người dùng", icon: Users }],
    });
  }
  if (hasRole(user, "lecturer")) {
    groups.push({
      group: "Giảng dạy",
      items: [{ href: "/courses", label: "Khóa học & lớp", icon: BookOpen }],
    });
  }
  if (hasRole(user, "student")) {
    groups.push({
      group: "Học tập",
      items: [{ href: "/me/classes", label: "Lớp của tôi", icon: LayoutGrid }],
    });
  }
  return groups;
}

export function BrandMark() {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-5 py-5">
      <span className="flex size-9 items-center justify-center rounded-lg bg-gold/15 text-gold">
        <Network className="size-5" aria-hidden />
      </span>
      <span className="leading-tight">
        <span className="block font-heading text-sm font-bold text-sidebar-foreground">
          LMS Lập trình mạng
        </span>
        <span className="block text-xs text-sidebar-foreground/50">
          Hệ thống quản lý học tập
        </span>
      </span>
    </Link>
  );
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const groups = navFor(user);

  return (
    <nav aria-label="Điều hướng chính" className="flex flex-1 flex-col gap-6 px-3 py-4">
      {groups.map((group) => (
        <div key={group.group} className="space-y-1">
          <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/50">
            {group.group}
          </p>
          {group.items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-200",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gold transition-opacity",
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
    <p className="px-5 py-4 text-xs text-sidebar-foreground/40">
      <GraduationCap className="mr-1 inline size-3.5 align-[-2px]" aria-hidden />
      {roleHint} · LMS v1
    </p>
  );
}
