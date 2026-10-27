import { useState } from "react";
import { Clock } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ErrorState } from "@/components/state-blocks";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { clockTime } from "./dashboard-format";
import { DashboardStatTiles } from "./dashboard-stat-tiles";
import { DashboardToolbar } from "./dashboard-toolbar";
import { QueueCard } from "./queue-card";
import { RealtimeCard } from "./realtime-card";
import { LatencyChartCard, SubmissionsChartCard, VerdictsCard } from "./stats-chart-cards";
import { TopClassesCard } from "./top-classes-card";
import { useAdminStats, type StatsRange } from "./use-admin-dashboard";

/** Tổng quan quản trị — docs/admin-spec.md §2, §3, §9 (route `/admin`). */
export function AdminDashboardPage() {
  const { status } = useAuthGuard(["admin"]);
  const [days, setDays] = useState<StatsRange>(7);
  const ready = status === "ok";
  const stats = useAdminStats(days, ready);
  if (!ready) return null;

  const data = stats.data;
  const statsFailed = stats.isError && !data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tổng quan hệ thống"
        meta={
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-4" strokeWidth={1.75} aria-hidden />
            {stats.dataUpdatedAt ? `Cập nhật lúc ${clockTime(stats.dataUpdatedAt)}` : "Đang tải số liệu…"}
          </span>
        }
        actions={<DashboardToolbar days={days} onDaysChange={setDays} />}
      />

      {statsFailed ? (
        <div className="rounded-xl border">
          <ErrorState error={stats.error} onRetry={() => stats.refetch()} />
        </div>
      ) : (
        <div aria-busy={stats.isPlaceholderData || undefined} className={stats.isPlaceholderData ? "opacity-60 transition-opacity" : undefined}>
          <DashboardStatTiles totals={data?.totals} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <RealtimeCard enabled={ready} />
        <QueueCard enabled={ready} />
        {statsFailed ? null : (
          <>
            <SubmissionsChartCard stats={data} />
            <LatencyChartCard stats={data} />
            <VerdictsCard stats={data} />
            <TopClassesCard stats={data} />
          </>
        )}
      </div>
    </div>
  );
}
