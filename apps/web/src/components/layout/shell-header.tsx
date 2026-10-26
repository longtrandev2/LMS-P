import { useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NotificationsBell } from "@/features/notifications/notifications-bell";
import { UserMenu } from "@/components/layout/user-menu";
import { BrandMark, SidebarNav, headerTitleFor } from "@/components/layout/nav-sidebar";
import { useAuthStore } from "@/stores/auth";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface ShellHeaderProps {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

/** Header trên: tiêu đề trang theo route + chuông thông báo + menu tài khoản */
export function ShellHeader({ mobileOpen, onMobileOpenChange }: ShellHeaderProps) {
  const pathname = useLocation().pathname;
  const user = useAuthStore((s) => s.user);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b bg-background/85 px-4 shadow-soft backdrop-blur supports-backdrop-filter:bg-background/70 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
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
            <SidebarNav onNavigate={() => onMobileOpenChange(false)} />
          </SheetContent>
        </Sheet>
        <h1 className="truncate text-sm font-semibold sm:text-base">
          {headerTitleFor(pathname, user)}
        </h1>
      </div>
      <div className="flex items-center gap-1.5">
        <NotificationsBell />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
