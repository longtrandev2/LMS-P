import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Inbox, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/state-blocks";
import { api } from "@/lib/api";
import { formatUtcDateTime } from "@/lib/date-time";
import { errorText } from "@/lib/error-messages";
import { queryKeys } from "@/lib/query-keys";
import type { QueueHealth, QueueStat } from "@/types/admin";
import { QUEUE_LABEL } from "./operations-labels";
import { ReasonDialog } from "./reason-dialog";

/** Hàng đợi chết (DLQ): số message, nút Dọn (chỉ `.dead`) — admin-spec §3, §4. Tự làm mới mỗi 10 giây. */
export function DeadQueuesTab() {
  const client = useQueryClient();
  const [target, setTarget] = useState<QueueStat | null>(null);
  const query = useQuery({
    queryKey: queryKeys.admin.queues,
    queryFn: ({ signal }) => api.get<QueueHealth>("/health/queue", undefined, signal),
    refetchInterval: 10_000,
  });
  const purge = useMutation({
    mutationFn: ({ name, reason }: { name: string; reason: string }) =>
      api.post<{ purged: number }>(`/admin/queues/${encodeURIComponent(name)}/purge`, { reason }),
    onSuccess: ({ purged }, { name }) => {
      toast.success(`Đã dọn ${purged} message khỏi ${name}.`);
      setTarget(null);
      void client.invalidateQueries({ queryKey: queryKeys.admin.queues });
    },
    onError: (error) => toast.error(errorText(error)),
  });
  const dead = (query.data?.queues ?? []).filter((q) => q.name.endsWith(".dead"));

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Message bị từ chối sau khi hết lượt thử lại. Dọn sẽ xóa vĩnh viễn, không đưa lại vào hàng chính.
        {query.data ? <> · Cập nhật {formatUtcDateTime(query.data.checked_at)}</> : null}
      </p>
      {query.isPending ? <ListSkeleton rows={4} />
        : query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} />
        : dead.length === 0 ? <EmptyState icon={Inbox} title="Không đọc được hàng đợi" description="Broker chưa phản hồi. Trang tự thử lại sau 10 giây." />
        : (
          <ul className="divide-y rounded-xl border">
            {dead.map((q) => (
              <li key={q.name} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{QUEUE_LABEL[q.name] ?? q.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{q.name}</p>
                </div>
                <Badge variant={q.messages > 0 ? "destructive" : "default"} className="tabular-nums">
                  {q.messages.toLocaleString("vi-VN")} message
                </Badge>
                <Button variant="outline" size="sm" disabled={q.messages === 0} onClick={() => setTarget(q)}
                  aria-label={`Dọn hàng đợi ${q.name}`}>
                  <Trash2 aria-hidden /> Dọn
                </Button>
              </li>
            ))}
          </ul>
        )}
      <ReasonDialog open={target !== null} onOpenChange={(open) => !open && setTarget(null)} pending={purge.isPending} destructive
        title={`Dọn ${target?.name ?? ""}?`}
        description={`${target?.messages ?? 0} message sẽ bị xóa vĩnh viễn. Thao tác không hoàn tác được.`}
        confirmLabel="Dọn hàng đợi" onConfirm={(reason) => target && purge.mutate({ name: target.name, reason })} />
    </div>
  );
}
