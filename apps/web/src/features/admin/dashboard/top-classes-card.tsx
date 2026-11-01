import { Link } from "react-router-dom";
import { School } from "lucide-react";
import { EmptyState, TableSkeleton } from "@/components/state-blocks";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/features/admin/charts/chart-scale";
import { cn } from "@/lib/utils";
import type { StatsView } from "@/types/admin";
import { DashboardPanel } from "./dashboard-panel";

const CELL = "first:pl-0 last:pr-0";

/** Bảng "Lớp nhiều bài nộp nhất" (tối đa 5 lớp trong kỳ) — admin-spec §2. */
export function TopClassesCard({ stats }: { stats?: StatsView }) {
  const rows = stats?.top_classes ?? [];
  return (
    <DashboardPanel title="Lớp nhiều bài nộp nhất" meta={stats ? `${stats.days} ngày gần nhất` : undefined}>
      {!stats ? <TableSkeleton rows={5} cols={3} /> : rows.length === 0 ? (
        <EmptyState compact icon={School} title="Chưa có bài nộp trong khoảng này" className="flex-1" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={cn(CELL, "w-8 text-center")}>TT</TableHead>
              <TableHead className={CELL}>Lớp</TableHead>
              <TableHead className={cn(CELL, "text-right")}>Bài nộp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={row.class_id}>
                <TableCell className={cn(CELL, "text-center tabular-nums text-muted-foreground")}>{i + 1}</TableCell>
                <TableCell className={cn(CELL, "max-w-0 w-full whitespace-normal")}>
                  <Link
                    to={`/classes/${row.class_id}`}
                    className="group block min-w-0 rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <span className="block truncate text-[13px] font-medium group-hover:underline group-hover:underline-offset-4">{row.name}</span>
                    <span className="block font-mono text-[11px] text-muted-foreground">{row.code}</span>
                  </Link>
                </TableCell>
                <TableCell className={cn(CELL, "text-right font-medium tabular-nums")}>{formatNumber(row.submissions)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </DashboardPanel>
  );
}
