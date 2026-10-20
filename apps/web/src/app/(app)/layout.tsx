"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { useAuthGuard } from "@/hooks/use-auth-guard";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { status } = useAuthGuard();

  if (status === "checking") {
    return (
      <div className="flex min-h-dvh items-center justify-center" aria-busy="true">
        <span className="text-sm text-muted-foreground">Đang kiểm tra phiên đăng nhập…</span>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="font-heading text-xl font-bold">Không có quyền truy cập</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Tài khoản của bạn không được phép xem trang này.
        </p>
        <button
          type="button"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          onClick={() => router.back()}
        >
          Quay lại trang trước
        </button>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
