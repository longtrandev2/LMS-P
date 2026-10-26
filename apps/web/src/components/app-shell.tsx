import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { BrandMark, SidebarAccount, SidebarNav } from "@/components/nav-sidebar";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { isWideRoute } from "@/components/breadcrumb-routes";
import { UserMenu } from "@/components/user-menu";
import { NotificationsBell } from "@/features/notifications/notifications-bell";
import { cn } from "@/lib/utils";

/**
 * Khung ứng dụng — DESIGN.md §4: sidebar 240px + topbar 56px (breadcrumb · chuông · theme · tài khoản).
 *
 * Bề rộng nội dung: mặc định `max-w-6xl`. Trang làm việc tràn rộng khi
 *  - route nằm trong `isWideRoute()` (editor, làm quiz, workspace code, kết quả), hoặc
 *  - phần tử gốc của trang có `data-layout="wide"` (bỏ max-width, giữ padding), hoặc
 *    `data-layout="full"` (bỏ cả max-width lẫn padding — trang tự lo lề, ví dụ workspace chia cột sát mép).
 * Header dính bên trong trang dùng `sticky top-14` (dưới topbar 56px).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const wide = isWideRoute(pathname);
  const close = () => setMobileOpen(false);

  return (
    <div className="flex min-h-dvh bg-background">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Đến nội dung chính
      </a>
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
        <BrandMark />
        <SidebarNav />
        <SidebarAccount />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur-sm supports-backdrop-filter:bg-background/80 sm:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Mở menu điều hướng" className="lg:hidden">
                <Menu aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
              <SheetTitle className="sr-only">Điều hướng</SheetTitle>
              <SheetDescription className="sr-only">Các trang theo vai trò của bạn</SheetDescription>
              <BrandMark />
              <SidebarNav onNavigate={close} />
              <SidebarAccount onNavigate={close} />
            </SheetContent>
          </Sheet>
          <div className="min-w-0 flex-1">
            <AppBreadcrumb />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <NotificationsBell />
            <ThemeToggle />
            <div className="ml-1"><UserMenu variant="avatar" /></div>
          </div>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className={cn(
            "mx-auto w-full flex-1 px-4 py-6 outline-none sm:px-6 sm:py-8",
            "has-[[data-layout=wide]]:max-w-none has-[[data-layout=full]]:max-w-none has-[[data-layout=full]]:p-0",
            wide ? "max-w-none" : "max-w-6xl"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
