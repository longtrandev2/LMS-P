import { useSyncExternalStore } from "react";
import { Navigate } from "react-router-dom";
import { homePathFor, useAuthStore } from "@/stores/auth";

/** `/` không có trang giới thiệu (như Frappe LMS): chuyển thẳng tới trang chủ theo vai trò hoặc đăng nhập. */
export default function RootPage() {
  const user = useAuthStore((s) => s.user);
  // Chờ zustand persist hydrate xong mới biết đã đăng nhập hay chưa
  const hydrated = useSyncExternalStore(
    (onStoreChange) => useAuthStore.persist.onFinishHydration(onStoreChange),
    () => useAuthStore.persist.hasHydrated(),
    () => false
  );
  if (!hydrated) return null;
  return <Navigate to={user ? homePathFor(user) : "/login"} replace />;
}
