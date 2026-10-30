import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/stores/auth";
import type { PublicSettings } from "@/types/admin";

const MINUTE = 60_000;
const POLL_MS = 2 * MINUTE;

/**
 * Cấu hình công khai — docs/admin-spec.md §1, §5.2. Mọi user đăng nhập đều đọc được; tín hiệu WS `settings.changed`
 * làm mới ngay (message-contracts §6.1), polling 120 giây là dự phòng cho banner bảo trì và các giới hạn.
 */
export function usePublicSettings() {
  const signedIn = useAuthStore((state) => state.user !== null);
  return useQuery({
    queryKey: queryKeys.admin.publicSettings,
    queryFn: ({ signal }) => api.get<PublicSettings>("/settings/public", undefined, signal),
    staleTime: MINUTE,
    refetchInterval: POLL_MS,
    enabled: signedIn,
  });
}

/** Đổi MB → byte để so với `File.size`. */
export const mbToBytes = (mb: number) => mb * 1024 * 1024;
