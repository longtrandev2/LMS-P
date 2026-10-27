import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { ClassSummary, Paginated } from "@/types/api";

/** Tất cả lớp sinh viên đang học (trang đầu, 50 lớp) — đủ cho "Sắp đến hạn" và header lớp. */
export function useMyClasses(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.me.classes(),
    queryFn: async ({ signal }) => {
      const data = await api.get<ClassSummary[] | Paginated<ClassSummary>>("/me/classes", { page: 1, limit: 50 }, signal);
      return Array.isArray(data) ? data : data.items;
    },
    enabled,
  });
}
