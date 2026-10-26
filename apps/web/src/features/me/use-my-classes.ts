import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { ClassSummary, Paginated } from "@/types/api";

/** Danh sách lớp đã ghi danh của sinh viên — dùng chung dashboard, trang lớp, trang chi tiết */
export function useMyClasses(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.me.classes(),
    queryFn: async ({ signal }) => {
      // BE đang transition sang Page envelope — chấp nhận cả array và {items}
      const data = await api.get<ClassSummary[] | Paginated<ClassSummary>>(
        "/me/classes",
        { page: 1, limit: 50 },
        signal
      );
      return Array.isArray(data) ? data : data.items;
    },
    enabled,
  });
}
