import { useMemo, useState } from "react";
import { CalendarDays, CalendarPlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SearchField } from "@/components/list-toolbar";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/state-blocks";
import { SESSION_MODE_LABEL, sessionDateLabel } from "@/lib/schedule";
import type { ClassSession, ClassSummary } from "@/types/api";
import { GenerateSessionsDialog } from "./generate-sessions-dialog";
import { NearestSessionPanel } from "./nearest-session-panel";
import { SessionFormDialog } from "./session-form-dialog";
import { SessionsTable } from "./sessions-table";
import { StatTiles, attendanceTiles } from "./stat-tiles";
import { nearestSession, useClassAttendanceSummary, useSessions } from "./use-schedule";

type ModeFilter = "all" | "in_person" | "online";

/** Tab Lịch học (giảng viên): ô thống kê → buổi gần nhất → thanh công cụ → bảng buổi học. */
export function ScheduleTab({ classId, clazz }: { classId: string; clazz?: ClassSummary }) {
  const sessions = useSessions(classId);
  const summary = useClassAttendanceSummary(classId);
  const [mode, setMode] = useState<ModeFilter>("all");
  const [search, setSearch] = useState("");
  const [generateOpen, setGenerateOpen] = useState(false);
  const [editing, setEditing] = useState<ClassSession | null | undefined>(undefined);

  const all = useMemo(() => sessions.data ?? [], [sessions.data]);
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((s) => (mode === "all" || s.mode === mode) && (!q
      || `${sessionDateLabel(s.date)} ${s.room ?? ""} ${s.title ?? ""}`.toLowerCase().includes(q)));
  }, [all, mode, search]);
  const nearest = nearestSession(all);

  const counts = (summary.data?.items ?? []).reduce((acc, row) => ({
    present: acc.present + row.present, late: acc.late + row.late, excused: acc.excused + row.excused, absent: acc.absent + row.absent,
  }), { present: 0, late: 0, excused: 0, absent: 0 });
  const total = summary.data?.total_sessions ?? 0, taken = summary.data?.taken_sessions ?? 0;

  return (
    <div className="space-y-6">
      <StatTiles loading={summary.isPending} tiles={attendanceTiles(counts, { total, taken, unmarked: Math.max(total - taken, 0) })} />
      {nearest ? <NearestSessionPanel classId={classId} session={nearest} /> : null}

      <section aria-labelledby="sessions-title" className="space-y-3">
        <h2 id="sessions-title" className="sr-only">Danh sách buổi học</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => setGenerateOpen(true)}><CalendarPlus aria-hidden /> Sinh lịch học</Button>
          <Button onClick={() => setEditing(null)}><Plus aria-hidden /> Thêm buổi</Button>
          <ToggleGroup type="single" size="sm" value={mode} onValueChange={(v) => v && setMode(v as ModeFilter)} aria-label="Lọc theo hình thức" className="sm:ml-2">
            <ToggleGroupItem value="all">Tất cả</ToggleGroupItem>
            <ToggleGroupItem value="in_person">{SESSION_MODE_LABEL.in_person}</ToggleGroupItem>
            <ToggleGroupItem value="online">{SESSION_MODE_LABEL.online}</ToggleGroupItem>
          </ToggleGroup>
          <div className="flex w-full items-center gap-3 sm:ml-auto sm:w-auto">
            <SearchField className="flex-1 sm:w-56" value={search} onChange={setSearch} placeholder="Tìm ngày, phòng, tiêu đề" />
            <span className="shrink-0 text-sm text-muted-foreground">Tổng số: <strong className="font-semibold text-primary tabular-nums">{visible.length}</strong></span>
          </div>
        </div>
        {sessions.isPending ? <TableSkeleton cols={7} rows={6} />
          : sessions.isError ? <ErrorState error={sessions.error} onRetry={() => sessions.refetch()} />
          : all.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Lớp chưa có lịch học"
              description="Sinh lịch theo mẫu tuần (ví dụ Thứ 3 tiết 1–3) hoặc thêm từng buổi."
              action={<Button variant="secondary" size="sm" onClick={() => setGenerateOpen(true)}><CalendarPlus aria-hidden /> Sinh lịch học</Button>} />
          ) : visible.length === 0 ? (
            <EmptyState compact icon={CalendarDays} title="Không có buổi phù hợp" description="Thử bỏ lọc hình thức hoặc từ khóa khác." />
          ) : <SessionsTable classId={classId} sessions={visible} onEdit={setEditing} />}
      </section>

      {generateOpen ? <GenerateSessionsDialog classId={classId} clazz={clazz} sessions={all} onOpenChange={setGenerateOpen} /> : null}
      {editing !== undefined ? (
        <SessionFormDialog key={editing?.id ?? "new"} classId={classId} clazz={clazz} session={editing}
          onOpenChange={(open) => { if (!open) setEditing(undefined); }} />
      ) : null}
    </div>
  );
}
