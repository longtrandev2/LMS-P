import { FileCode2, Inbox } from "lucide-react";
import { EmptyState } from "@/components/state-blocks";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, type BarSeries } from "@/features/admin/charts/bar-chart";
import { formatNumber } from "@/features/admin/charts/chart-scale";
import { HBarList, type HBarItem } from "@/features/admin/charts/hbar-list";
import { LineChart, type LineSeries } from "@/features/admin/charts/line-chart";
import { VERDICT_LABEL } from "@/lib/verdicts";
import type { GradingVerdict } from "@/types/api";
import type { StatsView } from "@/types/admin";
import { dayLabel, dayTitle, formatSeconds } from "./dashboard-format";
import { DashboardPanel } from "./dashboard-panel";

const CHART_HEIGHT = 200;
const SUBMISSION_SERIES: BarSeries[] = [
  { key: "objective", label: "Khách quan", fillClass: "fill-chart-3", swatchClass: "bg-chart-3" },
  { key: "code", label: "Code", fillClass: "fill-foreground/80", swatchClass: "bg-foreground/80" },
];
const LATENCY_SERIES: LineSeries[] = [
  { key: "avg", label: "Trung bình", strokeClass: "stroke-foreground", fillClass: "fill-foreground" },
  { key: "p95", label: "p95", strokeClass: "stroke-muted-foreground", fillClass: "fill-muted-foreground", dashed: true },
];
const VERDICT_ORDER = ["AC", "WA", "TLE", "MLE", "RE", "CE", "OLE", "SYSTEM_ERROR", "failed"];

function verdictBar(key: string): string {
  if (key === "AC") return "bg-success";
  if (key === "failed" || key === "SYSTEM_ERROR") return "bg-destructive";
  if (key === "TLE" || key === "MLE" || key === "OLE") return "bg-warning";
  return "bg-muted-foreground";
}

function verdictLabel(key: string): string {
  if (key === "failed") return "Chấm thất bại";
  return VERDICT_LABEL[key as GradingVerdict] ?? key;
}

const ChartSkeleton = () => <Skeleton aria-label="Đang tải" className="w-full rounded-lg" style={{ height: CHART_HEIGHT + 28 }} />;
const NoCode = () => <EmptyState compact icon={FileCode2} title="Chưa có bài code trong khoảng này" className="flex-1" />;
const rangeMeta = (stats?: StatsView) => (stats ? `${stats.days} ngày gần nhất` : undefined);

export function SubmissionsChartCard({ stats }: { stats?: StatsView }) {
  const total = stats?.daily.reduce((sum, d) => sum + d.submissions_objective + d.submissions_code, 0) ?? 0;
  return (
    <DashboardPanel title="Bài nộp theo ngày" meta={stats ? `${formatNumber(total)} bài trong ${stats.days} ngày gần nhất` : undefined}>
      {!stats ? <ChartSkeleton /> : total === 0 ? (
        <EmptyState compact icon={Inbox} title="Chưa có bài nộp trong khoảng này" className="flex-1" />
      ) : (
        <BarChart
          label="Bài nộp theo ngày, cột chồng khách quan và code"
          series={SUBMISSION_SERIES}
          height={CHART_HEIGHT}
          unit="bài"
          data={stats.daily.map((d) => ({
            label: dayLabel(d.date), title: dayTitle(d.date),
            values: { objective: d.submissions_objective, code: d.submissions_code },
          }))}
        />
      )}
    </DashboardPanel>
  );
}

export function LatencyChartCard({ stats }: { stats?: StatsView }) {
  const hasCode = stats?.daily.some((d) => d.grading_avg_ms != null) ?? false;
  return (
    <DashboardPanel title="Độ trễ chấm" meta={stats ? `Từ lúc nộp tới khi có kết quả, bài code · ${rangeMeta(stats)}` : undefined}>
      {!stats ? <ChartSkeleton /> : !hasCode ? <NoCode /> : (
        <LineChart
          label="Độ trễ chấm bài code theo ngày, trung bình và p95, đơn vị giây"
          series={LATENCY_SERIES}
          height={CHART_HEIGHT}
          unit="giây"
          format={(ms) => formatSeconds(ms, false)}
          formatValue={(ms) => formatSeconds(ms)}
          data={stats.daily.map((d) => ({
            label: dayLabel(d.date), title: dayTitle(d.date),
            values: { avg: d.grading_avg_ms, p95: d.grading_p95_ms },
          }))}
        />
      )}
    </DashboardPanel>
  );
}

export function VerdictsCard({ stats }: { stats?: StatsView }) {
  const keys = stats ? [...VERDICT_ORDER, ...Object.keys(stats.verdicts).filter((k) => !VERDICT_ORDER.includes(k))] : [];
  const items: HBarItem[] = keys.map((key) => ({
    key, label: verdictLabel(key), code: key === "failed" ? undefined : key === "SYSTEM_ERROR" ? "SE" : key,
    value: stats?.verdicts[key] ?? 0, barClass: verdictBar(key),
  }));
  const total = items.reduce((sum, i) => sum + i.value, 0);
  return (
    <DashboardPanel title="Kết quả chấm" meta={stats ? `${formatNumber(total)} bài code · ${rangeMeta(stats)}` : undefined}>
      {!stats ? <ChartSkeleton /> : total === 0 ? <NoCode /> : (
        <HBarList label="Phân bố kết quả chấm bài code" items={items} />
      )}
    </DashboardPanel>
  );
}
