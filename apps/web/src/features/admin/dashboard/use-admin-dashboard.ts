import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { saveBlob } from "@/features/grades/lecturer/grade-csv";
import type { QueueHealth, RealtimeView, StatsView } from "@/types/admin";

export type StatsRange = 7 | 30;

/** Thẻ hàng đợi và realtime cập nhật mỗi 10 giây — admin-spec §3. */
const LIVE_INTERVAL_MS = 10_000;

export function useAdminStats(days: StatsRange, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.admin.stats(days),
    queryFn: ({ signal }) => api.get<StatsView>("/admin/stats", { days }, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useAdminRealtime(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.admin.realtime,
    queryFn: ({ signal }) => api.get<RealtimeView>("/admin/realtime", undefined, signal),
    refetchInterval: LIVE_INTERVAL_MS,
    enabled,
  });
}

export function useQueueHealth(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.admin.queues,
    queryFn: ({ signal }) => api.get<QueueHealth>("/health/queue", undefined, signal),
    refetchInterval: LIVE_INTERVAL_MS,
    // Broker sập (503) là trạng thái cần hiện ngay, không thử lại nhiều lần.
    retry: (count, error) => !(error instanceof ApiError && error.status === 503) && count < 2,
    enabled,
  });
}

/** Broker không phản hồi → API trả 503 kèm `queues: []`. */
export function isBrokerDown(error: unknown): boolean {
  return error instanceof ApiError && error.status === 503;
}

/** GET /admin/stats/export → CSV (UTF-8 BOM) → lưu tệp. */
export async function exportStatsCsv(days: StatsRange): Promise<void> {
  const { blob, filename } = await api.download("/admin/stats/export", { days });
  saveBlob(blob, filename ?? `thong-ke-${days}-ngay.csv`);
}
