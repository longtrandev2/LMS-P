import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { LoginSessionView } from "@/types/admin";

/** Phiên đăng nhập còn hiệu lực của một user + thu hồi một/tất cả — admin-spec §6. */
export function useUserSessions(userId: number | null) {
  const cache = useQueryClient();
  const key = queryKeys.admin.userSessions(userId ?? 0);
  const list = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => api.get<LoginSessionView[]>(`/admin/users/${userId}/sessions`, undefined, signal),
    enabled: userId != null,
  });
  const refresh = () => cache.invalidateQueries({ queryKey: key });
  const revokeOne = useMutation({
    mutationFn: (family: string) => api.delete<void>(`/admin/users/${userId}/sessions/${encodeURIComponent(family)}`),
    onSettled: refresh,
  });
  const revokeAll = useMutation({
    mutationFn: () => api.delete<void>(`/admin/users/${userId}/sessions`),
    onSettled: refresh,
  });
  return { list, revokeOne, revokeAll };
}
