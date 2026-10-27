import { Link } from "react-router-dom";
import { ArrowRight, Unplug } from "lucide-react";
import { TableSkeleton } from "@/components/state-blocks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/features/admin/charts/chart-scale";
import { cn } from "@/lib/utils";
import type { QueueStat } from "@/types/admin";
import { clockTime, isDeadQueue, queueLabel } from "./dashboard-format";
import { DashboardPanel, PanelError } from "./dashboard-panel";
import { isBrokerDown, useQueueHealth } from "./use-admin-dashboard";

const CELL = "first:pl-0 last:pr-0";

function BrokerDown({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
      <Unplug className="size-5 text-destructive" strokeWidth={1.75} aria-hidden />
      <p className="text-sm font-medium">Không kết nối được RabbitMQ</p>
      <p className="max-w-xs text-sm text-muted-foreground">Bài nộp mới sẽ chưa được chấm cho tới khi broker hoạt động lại.</p>
      <Button variant="outline" size="sm" className="mt-1" onClick={onRetry}>Kiểm tra lại</Button>
    </div>
  );
}

interface QueuePair { name: string; main?: QueueStat; dead?: QueueStat }

/** Gộp mỗi hàng đợi với hàng lỗi `.dead` của nó thành một dòng, giữ thứ tự từ API. */
function pairQueues(queues: QueueStat[]): QueuePair[] {
  const pairs = new Map<string, QueuePair>();
  for (const queue of queues) {
    const base = queue.name.replace(/\.dead$/, "");
    const pair = pairs.get(base) ?? { name: base };
    if (isDeadQueue(queue.name)) pair.dead = queue; else pair.main = queue;
    pairs.set(base, pair);
  }
  return [...pairs.values()];
}

function QueueRow({ pair }: { pair: QueuePair }) {
  const deadMessages = pair.dead?.messages ?? 0;
  const alert = deadMessages > 0;
  const noConsumer = pair.main?.consumers === 0;
  return (
    <TableRow className={cn(alert && "bg-destructive/6 hover:bg-destructive/8")}>
      <TableCell className={cn(CELL, "whitespace-normal")}>
        <span className="block text-[13px]">{queueLabel(pair.name)}</span>
        <span className="block font-mono text-[11px] text-muted-foreground">{pair.name}</span>
      </TableCell>
      <TableCell className={cn(CELL, "text-right tabular-nums")}>{pair.main ? formatNumber(pair.main.messages) : "—"}</TableCell>
      <TableCell className={cn(CELL, "text-right tabular-nums", noConsumer ? "font-medium text-warning" : "text-muted-foreground")}>
        {pair.main ? formatNumber(pair.main.consumers) : "—"}
      </TableCell>
      <TableCell className={cn(CELL, "text-right tabular-nums")}>
        {!pair.dead ? "—" : alert ? (
          <span className="inline-flex flex-wrap items-center justify-end gap-x-2">
            <span className="font-semibold text-destructive" title={pair.dead.name}>{formatNumber(deadMessages)}</span>
            <Link to="/admin/operations" className="inline-flex items-center gap-0.5 text-[13px] font-medium text-destructive underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
              Xử lý <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </span>
        ) : <span className="text-muted-foreground" title={pair.dead.name}>0</span>}
      </TableCell>
    </TableRow>
  );
}

/** Thẻ "Hàng đợi chấm": độ sâu + consumer từng hàng, cột hàng lỗi (DLQ) đỏ khi còn tin — admin-spec §3, §9. */
export function QueueCard({ enabled }: { enabled: boolean }) {
  const query = useQueueHealth(enabled);
  const down = query.isError && isBrokerDown(query.error);
  const queues = down ? [] : query.data?.queues ?? [];
  const deadTotal = queues.filter((q) => isDeadQueue(q.name)).reduce((sum, q) => sum + q.messages, 0);
  const status = down ? <Badge variant="destructive">Mất kết nối</Badge>
    : deadTotal > 0 ? <Badge variant="destructive">{formatNumber(deadTotal)} tin lỗi</Badge>
      : query.data ? <Badge variant="success">Bình thường</Badge> : null;

  return (
    <DashboardPanel
      title="Hàng đợi chấm"
      meta={query.dataUpdatedAt ? `Tự cập nhật mỗi 10 giây · lúc ${clockTime(Math.max(query.dataUpdatedAt, query.errorUpdatedAt), true)}` : "Tự cập nhật mỗi 10 giây"}
      action={status}
    >
      {query.isPending ? (
        <TableSkeleton rows={4} cols={4} />
      ) : down ? (
        <BrokerDown onRetry={() => query.refetch()} />
      ) : query.isError && !query.data ? (
        <PanelError error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={CELL}>Hàng đợi</TableHead>
              <TableHead className={cn(CELL, "text-right")}>Tin chờ</TableHead>
              <TableHead className={cn(CELL, "text-right")}>Consumer</TableHead>
              <TableHead className={cn(CELL, "text-right")}>Hàng lỗi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{pairQueues(queues).map((pair) => <QueueRow key={pair.name} pair={pair} />)}</TableBody>
        </Table>
      )}
    </DashboardPanel>
  );
}
