import { Link } from "react-router-dom";
import { TriangleAlert } from "lucide-react";
import { hasRole, useAuthStore } from "@/stores/auth";
import { usePublicSettings } from "./use-public-settings";

const FALLBACK = "Hệ thống đang bảo trì. Bạn vẫn xem được dữ liệu nhưng chưa thể bắt đầu bài làm mới.";

/** Dải cảnh báo bảo trì trên mọi trang trong khung — docs/admin-spec.md §5.2. Admin có thêm link tắt nhanh. */
export function MaintenanceBanner() {
  const isAdmin = useAuthStore((state) => hasRole(state.user, "admin"));
  const { data } = usePublicSettings();
  const maintenance = data?.maintenance;
  if (!maintenance?.enabled) return null;

  return (
    <div role="status" className="flex items-start gap-2.5 border-b border-warning/25 bg-warning/12 px-4 py-2 text-sm sm:px-8">
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
      <p className="min-w-0 flex-1">
        <span className="font-medium text-warning">Đang bảo trì.</span>{" "}
        <span className="text-foreground/85">{maintenance.message?.trim() || FALLBACK}</span>
      </p>
      {isAdmin ? (
        <Link to="/admin/settings#maintenance"
          className="shrink-0 font-medium text-foreground underline underline-offset-4 hover:text-primary">
          Tắt bảo trì
        </Link>
      ) : null}
    </div>
  );
}
