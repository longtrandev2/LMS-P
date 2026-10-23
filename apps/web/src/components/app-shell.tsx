import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NotificationsBell } from "@/features/notifications/notifications-bell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { BrandMark, SidebarFooterRole, SidebarNav } from "@/components/nav-sidebar";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { ROLE_LABELS } from "@/components/role-status-badges";

function UserMenu() {
  const navigate = useNavigate();
  const { user, refreshToken, clearSession } = useAuthStore();

  const handleLogout = async () => {
    try {
      // BE yêu cầu body {refresh_token} để revoke — không gửi sẽ 400
      if (refreshToken) await api.post("/auth/logout", { refresh_token: refreshToken });
    } catch {
      /* logout là best-effort — session local vẫn phải clear */
    }
    clearSession();
    navigate("/login", { replace: true });
  };

  const initials = (user?.full_name ?? "?")
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="gap-2.5 px-2 py-1.5 font-normal data-[state=open]:bg-accent"
        >
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-40 truncate text-sm sm:block">
            {user?.full_name}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <p className="truncate text-sm font-medium">{user?.full_name}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">{user?.email}</p>
          <p className="mt-1 text-xs font-normal text-muted-foreground">
            {user?.roles.map((r) => ROLE_LABELS[r]).join(" · ")}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut aria-hidden /> Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-dvh">
      {/* Sidebar desktop — nền trung tính + viền phải, chuẩn product */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground lg:flex">
        <BrandMark />
        <SidebarNav />
        <SidebarFooterRole />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b bg-background/85 px-4 shadow-soft backdrop-blur supports-backdrop-filter:bg-background/70 sm:px-6">
          <div className="flex items-center gap-2">
            {/* Sidebar mobile */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Mở menu" className="lg:hidden">
                  <Menu aria-hidden />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-64 bg-sidebar p-0 text-sidebar-foreground [&>button]:text-sidebar-foreground"
              >
                <SheetHeader className="p-0 text-left">
                  <SheetTitle asChild>
                    <div>
                      <BrandMark />
                    </div>
                  </SheetTitle>
                </SheetHeader>
                <SidebarNav onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            <span className="hidden text-sm text-muted-foreground sm:block">
              Hệ thống quản lý học tập
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <NotificationsBell />
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
