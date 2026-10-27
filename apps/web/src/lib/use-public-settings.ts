import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { PublicSettings } from "@/types/admin";

/** Giới hạn hệ thống cho mọi user đăng nhập — docs/admin-spec.md §1 (`GET /settings/public`). */
export function usePublicSettings() {
  return useQuery({
    queryKey: queryKeys.admin.publicSettings,
    queryFn: ({ signal }) => api.get<PublicSettings>("/settings/public", undefined, signal),
    staleTime: 60_000,
  });
}

/** Đổi MB → byte để so với `File.size`. */
export const mbToBytes = (mb: number) => mb * 1024 * 1024;
