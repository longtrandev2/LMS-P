import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, LogOut, Menu, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NotificationsBell } from "@/features/notifications/notifications-bell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAvatarUrl } from "@/hooks/use-avatar-url";
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
  const avatarSrc = useAvatarUrl(user?.avatar_url);

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
          className="h-11 gap-2.5 rounded-xl px-2 py-1.5 font-normal data-[state=open]:bg-accent"
        >
          <Avatar className="size-8">
            {avatarSrc ? <AvatarImage src={avatarSrc} alt="Ảnh đại diện" /> : null}
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-40 text-left sm:block"><span className="block truncate text-sm font-semibold">{user?.full_name}</span><span className="block text-[11px] text-muted-foreground">{user?.roles.map((role) => ROLE_LABELS[role]).join(" · ")}</span></span>
          <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" aria-hidden />
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
        <DropdownMenuItem onClick={() => navigate("/me/profile")}><UserRound aria-hidden /> Hồ sơ của tôi</DropdownMenuItem>
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut aria-hidden /> Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const section = pathname.startsWith("/questions") ? "Ngân hàng câu hỏi" : pathname.startsWith("/admin/academics") ? "Học phần & phân công" : pathname.startsWith("/admin/users") ? "Quản lý người dùng" : pathname.startsWith("/admin/audit") ? "Nhật ký kiểm toán" : pathname.startsWith("/me/profile") ? "Hồ sơ cá nhân" : pathname.startsWith("/me/classes") ? "Lớp của tôi" : pathname.startsWith("/courses") ? "Lớp được giao" : "Lớp học phần";

  return (
    <div className="flex min-h-dvh">
      <a href="#main-content" className="sr-only z-50 rounded-lg bg-primary p-3 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Đến nội dung chính</a>
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground lg:flex">
        <BrandMark />
        <SidebarNav />
        <SidebarFooterRole />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between gap-3 border-b bg-card/90 px-4 backdrop-blur sm:px-6 xl:px-10">
          <div className="flex min-w-0 items-center gap-2">
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
            <div className="flex min-w-0 items-center gap-2 text-sm"><span className="hidden text-muted-foreground md:inline">Không gian làm việc</span><ChevronRight className="hidden size-3.5 text-muted-foreground/60 md:block" aria-hidden /><span className="truncate font-medium">{section}</span></div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <NotificationsBell />
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>
        <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-4 py-7 sm:px-6 sm:py-9 xl:px-10">{children}</main>
      </div>
    </div>
  );
}
