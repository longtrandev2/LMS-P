import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useRealtimeEvents } from "@/lib/realtime/use-realtime";
import type { RunAccepted, RunJob } from "@/types/api";

const ACTIVE = new Set(["pending", "running"]);

/**
 * Theo dõi một run job (kiểm tra đề / chạy thử) — docs/assessment-spec.md §7.
 * `start(path, body)` gửi POST trả `{run_id}`; kết quả cập nhật qua WS `run.completed` và poll 1,5s dự phòng.
 */
export function useRunJob() {
  const client = useQueryClient();
  const [runId, setRunId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const job = useQuery({
    queryKey: queryKeys.runJobs.detail(runId ?? ""),
    queryFn: () => api.get<RunJob>(`/run-jobs/${runId}`),
    enabled: runId != null,
    refetchInterval: (query) => ACTIVE.has(query.state.data?.status ?? "pending") ? 1500 : false,
  });
  const refresh = useCallback(() => {
    if (runId) void client.invalidateQueries({ queryKey: queryKeys.runJobs.detail(runId) });
  }, [client, runId]);
  useRealtimeEvents({
    onMessage: (type, data) => {
      if (type.startsWith("run.") && (data as { run_id?: string } | undefined)?.run_id === runId) refresh();
    },
    onOpen: refresh,
  }, { replayOpen: true });
  const start = useCallback(async (path: string, body: unknown) => {
    setStarting(true);
    try {
      const accepted = await api.post<RunAccepted>(path, body);
      setRunId(accepted.run_id);
      return accepted.run_id;
    } finally { setStarting(false); }
  }, []);
  const running = starting || (runId != null && ACTIVE.has(job.data?.status ?? "pending"));
  return { start, runId, job: job.data ?? null, error: job.error, running, reset: () => setRunId(null) };
}
