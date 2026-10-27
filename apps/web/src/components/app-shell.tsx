import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "@/components/nav-sidebar";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { isWideRoute } from "@/components/breadcrumb-routes";
import { NotificationsBell } from "@/features/notifications/notifications-bell";
import { MaintenanceBanner } from "@/features/admin/shared/maintenance-banner";
import { cn } from "@/lib/utils";

const COLLAPSE_KEY = "lmsp-sidebar-collapsed";

function readCollapsed(): boolean {
  try { return localStorage.getItem(COLLAPSE_KEY) === "1"; } catch { return false; }
}

/**
 * Khung ứng dụng kiểu Frappe LMS — DESIGN.md §4: sidebar xám nhạt (thu gọn được) + topbar 48px chỉ có
 * breadcrumb và chuông. Nội dung trắng, mặc định `max-w-5xl`; trang làm việc tràn rộng khi route nằm trong
 * `isWideRoute()` hoặc trang đặt `data-layout="wide"` (giữ padding) / `data-layout="full"` (bỏ padding).
 * Header dính bên trong trang dùng `sticky top-12`.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const { pathname } = useLocation();
  const wide = isWideRoute(pathname);
  const toggle = () => setCollapsed((value) => {
    try { localStorage.setItem(COLLAPSE_KEY, value ? "0" : "1"); } catch { /* bỏ qua */ }
    return !value;
  });

  return (
    <div className="flex min-h-dvh bg-background">
      <a href="#main-content"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Đến nội dung chính
      </a>
      <aside className={cn("sticky top-0 hidden h-dvh shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:block",
        collapsed ? "w-14" : "w-60")}>
        <Sidebar collapsed={collapsed} onToggle={toggle} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur-sm sm:px-5">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Mở menu điều hướng" className="lg:hidden">
                <Menu aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
              <SheetTitle className="sr-only">Điều hướng</SheetTitle>
              <SheetDescription className="sr-only">Các trang theo vai trò của bạn</SheetDescription>
              <Sidebar onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="min-w-0 flex-1"><AppBreadcrumb /></div>
          <NotificationsBell />
        </header>
        <MaintenanceBanner />
        <main id="main-content" tabIndex={-1}
          className={cn(
            "mx-auto w-full flex-1 px-4 py-6 outline-none sm:px-8 sm:py-8",
            "has-[[data-layout=wide]]:max-w-none has-[[data-layout=full]]:max-w-none has-[[data-layout=full]]:p-0",
            wide ? "max-w-none" : "max-w-5xl"
          )}>
          {children}
        </main>
      </div>
    </div>
  );
}
