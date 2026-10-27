import { CheckCircle2, CircleDashed, PencilLine, Users, WifiOff } from "lucide-react";
import { SearchField } from "@/components/list-toolbar";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { StatTile } from "@/features/schedule/lecturer/stat-tiles";
import type { MonitorRow, MonitorTable } from "@/types/exams";

export type MonitorFilter = "all" | "not_started" | "in_progress" | "submitted" | "offline";

const FILTERS: { value: MonitorFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "not_started", label: "Chưa vào thi" },
  { value: "in_progress", label: "Đang làm" },
  { value: "submitted", label: "Đã nộp" },
  { value: "offline", label: "Mất kết nối" },
];

export function monitorTiles(summary: MonitorTable["summary"] | undefined): StatTile[] {
  const value = (n: number | undefined) => n ?? "—";
  return [
    { key: "total", label: "Sĩ số", value: value(summary?.total), tone: "brand", icon: Users },
    { key: "not_started", label: "Chưa vào thi", value: value(summary?.not_started), tone: "neutral", icon: CircleDashed },
    { key: "in_progress", label: "Đang làm", value: value(summary?.in_progress), tone: "info", icon: PencilLine },
    { key: "submitted", label: "Đã nộp", value: value(summary?.submitted), tone: "success", icon: CheckCircle2 },
    { key: "offline", label: "Mất kết nối", value: value(summary?.offline), tone: summary?.offline ? "destructive" : "neutral", icon: WifiOff },
  ];
}

export function filterRows(rows: MonitorRow[], filter: MonitorFilter, search: string): MonitorRow[] {
  const term = search.trim().toLowerCase();
  return rows.filter((row) =>
    (filter === "all" || (filter === "offline" ? row.status === "in_progress" && !row.online : row.status === filter))
    && (!term || `${row.student_full_name} ${row.student_code ?? ""}`.toLowerCase().includes(term)));
}

/** Thanh công cụ: lọc trạng thái (segmented) · tìm tên/mã · thời điểm cập nhật gần nhất. */
export function MonitorToolbar({ filter, onFilter, search, onSearch, status }: {
  filter: MonitorFilter; onFilter: (value: MonitorFilter) => void;
  search: string; onSearch: (value: string) => void; status: React.ReactNode;
}) {
  return <div className="flex flex-wrap items-center gap-2 pb-3">
    <ToggleGroup type="single" size="sm" aria-label="Lọc theo trạng thái" value={filter}
      onValueChange={(value) => { if (value) onFilter(value as MonitorFilter); }}>
      {FILTERS.map((item) => <ToggleGroupItem key={item.value} value={item.value} className="px-2.5 text-[13px]">{item.label}</ToggleGroupItem>)}
    </ToggleGroup>
    <SearchField className="w-full sm:w-64" value={search} onChange={onSearch} placeholder="Tìm tên hoặc mã sinh viên" label="Tìm sinh viên" />
    <div className="ml-auto text-xs text-muted-foreground tabular-nums">{status}</div>
  </div>;
}
