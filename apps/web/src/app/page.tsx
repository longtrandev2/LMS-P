"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { homePathFor, useAuthStore } from "@/stores/auth";

/** Điều hướng về trang chủ theo vai trò */
export default function RootPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    router.replace(user ? homePathFor(user) : "/login");
  }, [router, user]);

  return (
    <div className="flex min-h-dvh items-center justify-center" aria-busy="true">
      <span className="text-sm text-muted-foreground">Đang chuyển hướng…</span>
    </div>
  );
}
