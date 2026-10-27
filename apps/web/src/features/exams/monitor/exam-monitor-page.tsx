import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { AlertTriangle, RefreshCw, SearchX, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/state-blocks";
import { StatTiles } from "@/features/schedule/lecturer/stat-tiles";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { ApiError } from "@/lib/api";
import { MonitorHeader } from "./monitor-header";
import { clockTime } from "./monitor-labels";
import { MonitorTable } from "./monitor-table";
import { MonitorToolbar, filterRows, monitorTiles, type MonitorFilter } from "./monitor-toolbar";
import { useMonitorAssignment, useMonitorTable, useServerClock } from "./use-exam-monitor";

/** `/classes/:classId/assignments/:assignmentId/monitor` — giám sát phiên làm bài (exam-spec §7, §8.3). */
export function ExamMonitorPage() {
  const { classId = "", assignmentId = "" } = useParams();
  const { status } = useAuthGuard(["lecturer", "admin"]);
  const id = Number(assignmentId);
  const details = useMonitorAssignment(id, status === "ok");
  const monitor = useMonitorTable(id, status === "ok");
  const serverNow = useServerClock(monitor.data?.server_now, monitor.dataUpdatedAt);
  const [filter, setFilter] = useState<MonitorFilter>("all");
  const [search, setSearch] = useState("");
  const rows = useMemo(() => filterRows(monitor.data?.items ?? [], filter, search), [monitor.data, filter, search]);
  if (status !== "ok") return null;

  const assignment = details.data?.assignment;
  const resultsHref = `/classes/${classId}/assignments/${id}/results`;
  const notSession = monitor.error instanceof ApiError && monitor.error.status === 409;
  const filtered = filter !== "all" || search.trim() !== "";
  const updated = monitor.data ? <span className="inline-flex items-center gap-1.5">
    {monitor.isError ? <AlertTriangle className="size-3.5 text-warning" aria-hidden /> : null}
    {monitor.isError ? "Không cập nhật được · " : ""}Cập nhật lúc {clockTime(monitor.dataUpdatedAt)}
    <Button variant="ghost" size="icon-xs" aria-label="Làm mới ngay" disabled={monitor.isFetching} onClick={() => void monitor.refetch()}>
      <RefreshCw className={monitor.isFetching ? "animate-spin motion-reduce:animate-none" : undefined} aria-hidden />
    </Button>
  </span> : null;

  return <div data-layout="wide" className="mx-auto w-full max-w-6xl space-y-6">
    {details.isError ? <ErrorState error={details.error} onRetry={() => void details.refetch()} /> : null}
    {details.isPending ? <div aria-busy="true" aria-label="Đang tải" className="space-y-3"><Skeleton className="h-7 w-72" /><Skeleton className="h-4 w-96 max-w-full" /></div> : null}
    {assignment ? <MonitorHeader assignment={assignment} resultsHref={resultsHref} /> : null}

    {notSession ? <EmptyState icon={AlertTriangle} title="Bài này không giao theo phiên"
      description="Chỉ kỳ thi và quiz có giới hạn thời gian mới có màn giám sát. Xem kết quả bài ở trang Kết quả." /> : <>
      <StatTiles tiles={monitorTiles(monitor.data?.summary)} loading={monitor.isPending} className="lg:grid-cols-5" />
      <section aria-label="Danh sách sinh viên dự thi">
        <MonitorToolbar filter={filter} onFilter={setFilter} search={search} onSearch={setSearch} status={updated} />
        {monitor.isPending ? <TableSkeleton rows={5} cols={8} /> : null}
        {monitor.isError && !monitor.data ? <ErrorState error={monitor.error} onRetry={() => void monitor.refetch()} /> : null}
        {monitor.data && rows.length === 0 ? <EmptyState compact icon={filtered ? SearchX : Users}
          title={filtered ? "Không có sinh viên phù hợp bộ lọc" : "Lớp chưa có sinh viên"} /> : null}
        {rows.length ? <MonitorTable assignmentId={id} rows={rows} serverNow={serverNow} /> : null}
      </section>
    </>}
  </div>;
}
