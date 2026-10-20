"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import type { Role } from "@/types/api";

type GuardStatus = "checking" | "ok" | "denied";

const EMPTY_ROLES: Role[] = [];

/**
 * Guard cho nhóm route (app): chưa đăng nhập → /login;
 * sai role → trả "denied" để layout hiển thị màn chặn.
 */
export function useAuthGuard(allowedRoles: Role[] = EMPTY_ROLES) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  // Tránh hydration mismatch: SSR/prerender thấy false, client thấy true sau khi persist hydrate
  const hydrated = useSyncExternalStore(
    (onStoreChange) => useAuthStore.persist.onFinishHydration(onStoreChange),
    () => useAuthStore.persist.hasHydrated(),
    () => false
  );

  const status: GuardStatus = !hydrated || !user
    ? "checking"
    : allowedRoles.length > 0 && !allowedRoles.some((role) => user.roles.includes(role))
      ? "denied"
      : "ok";

  useEffect(() => {
    if (hydrated && !user) router.replace("/login");
  }, [hydrated, user, router]);

  return { status, user };
}
