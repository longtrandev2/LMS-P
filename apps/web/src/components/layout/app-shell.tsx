import { useState } from "react";
import { BrandMark, SidebarFooterRole, SidebarNav } from "@/components/layout/nav-sidebar";
import { ShellHeader } from "@/components/layout/shell-header";

/**
 * Khung trang đăng nhập (mọi role): sidebar trái trắng viền phải,
 * header trên với tiêu đề trang + chuông + tài khoản. Áp cho toàn bộ route cũ/mới.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-dvh">
      {/* Sidebar desktop — nền trắng, viền phải xám nhạt, chuẩn Linear/Vercel */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
        <BrandMark />
        <SidebarNav />
        <SidebarFooterRole />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <ShellHeader mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
