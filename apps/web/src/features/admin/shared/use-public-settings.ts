import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/stores/auth";
import type { PublicSettings } from "@/types/admin";

const MINUTE = 60_000;

/**
 * Cấu hình công khai — docs/admin-spec.md §1, §5.2. Mọi user đăng nhập đều đọc được; làm mới mỗi 60 giây
 * để banner bảo trì và các giới hạn (ngôn ngữ, time/memory limit, dung lượng upload) theo kịp thay đổi của admin.
 */
export function usePublicSettings() {
  const signedIn = useAuthStore((state) => state.user !== null);
  return useQuery({
    queryKey: queryKeys.admin.publicSettings,
    queryFn: ({ signal }) => api.get<PublicSettings>("/settings/public", undefined, signal),
    staleTime: MINUTE,
    refetchInterval: MINUTE,
    enabled: signedIn,
  });
}
