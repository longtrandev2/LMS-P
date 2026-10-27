import { Cpu, PlugZap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/features/admin/charts/chart-scale";
import { HBarList } from "@/features/admin/charts/hbar-list";
import { cn } from "@/lib/utils";
import { clockTime } from "./dashboard-format";
import { DashboardPanel, PanelError } from "./dashboard-panel";
import { useAdminRealtime } from "./use-admin-dashboard";

const ROLES = [
  { key: "student", label: "Sinh viên" },
  { key: "lecturer", label: "Giảng viên" },
  { key: "admin", label: "Quản trị" },
] as const;

function Metric({ icon: Icon, label, children, tone }: { icon: typeof Cpu; label: string; children: React.ReactNode; tone?: "warning" }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5", tone === "warning" ? "bg-warning/12" : "bg-secondary")}>
      <Icon className={cn("size-4 shrink-0", tone === "warning" ? "text-warning" : "text-muted-foreground")} strokeWidth={1.9} aria-hidden />
      <span className="min-w-0 flex-1 text-[13px] text-foreground/80">{label}</span>
      <span className="flex items-center gap-2 text-sm tabular-nums">{children}</span>
    </div>
  );
}

/** Thẻ "Realtime": online theo vai trò, kết nối WebSocket chấm bài, số worker — admin-spec §3. */
export function RealtimeCard({ enabled }: { enabled: boolean }) {
  const query = useAdminRealtime(enabled);
  const data = query.data;
  const meta = data ? `Tự cập nhật mỗi 10 giây · lúc ${clockTime(query.dataUpdatedAt, true)}` : "Tự cập nhật mỗi 10 giây";

  return (
    <DashboardPanel title="Realtime" meta={meta}>
      {query.isPending ? (
        <div aria-busy="true" aria-label="Đang tải" className="space-y-3">
          <Skeleton className="h-16" /><Skeleton className="h-10" /><Skeleton className="h-10" />
        </div>
      ) : query.isError && !data ? (
        <PanelError error={query.error} onRetry={() => query.refetch()} />
      ) : data ? (
        <div className="space-y-4">
          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-[auto_1fr] sm:items-center">
            <div>
              <p className="text-[13px] text-muted-foreground">Đang trực tuyến</p>
              <p className="text-3xl leading-10 font-semibold tabular-nums">{formatNumber(data.online_users.total)}</p>
              <p className="text-xs text-muted-foreground">thao tác trong 5 phút gần nhất</p>
            </div>
            <HBarList
              label="Người dùng trực tuyến theo vai trò"
              items={ROLES.map((role) => ({ key: role.key, label: role.label, value: data.online_users[role.key], barClass: "bg-foreground/70" }))}
            />
          </div>
          <div className="space-y-2">
            <Metric icon={PlugZap} label="Kết nối WebSocket chấm bài">
              <span className="font-medium">{formatNumber(data.ws_connections)}</span>
              <span className="text-xs text-muted-foreground">kết nối · {formatNumber(data.ws_users)} người</span>
            </Metric>
            <Metric icon={Cpu} label="Worker chấm đang chạy" tone={data.workers === 0 ? "warning" : undefined}>
              {data.workers === 0 ? <Badge variant="warning">Không có worker</Badge> : null}
              <span className="font-medium">{formatNumber(data.workers)}</span>
            </Metric>
          </div>
        </div>
      ) : null}
    </DashboardPanel>
  );
}
