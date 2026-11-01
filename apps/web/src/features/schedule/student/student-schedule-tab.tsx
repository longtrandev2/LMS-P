import { useState } from "react";
import { CalendarX, FileClock } from "lucide-react";
import { SearchField } from "@/components/list-toolbar";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/state-blocks";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ClassSession, ClassSummary, SessionMode } from "@/types/api";
import { AttendanceStats } from "./attendance-stats";
import { LeaveHistoryDialog } from "./leave-history-dialog";
import { LeaveRequestDialog } from "./leave-request-dialog";
import { NearestSession, pickNearestSession } from "./nearest-session";
import { fold, shortDate, weekdayOf } from "./schedule-format";
import { SessionsTable } from "./sessions-table";
import { useClassSessions, useMyAttendanceSummary } from "./use-student-schedule";

type ModeFilter = "all" | SessionMode;

function matches(session: ClassSession, needle: string): boolean {
  if (!needle) return true;
  const haystack = [shortDate(session.date), weekdayOf(session.date), session.room ?? "", session.title ?? "", `buoi ${session.session_no}`].join(" ");
  return fold(haystack).includes(needle);
}

/**
 * Tab Lịch học của sinh viên (kiểu S-Link): 6 ô thống kê điểm danh của bản thân, khối buổi học gần nhất,
 * thanh công cụ (lịch sử đơn · lọc hình thức · tìm kiếm · tổng số) và bảng buổi học có nút xin nghỉ từng buổi.
 */
export function StudentScheduleTab({ classId, clazz }: { classId: string; clazz?: ClassSummary }) {
  const sessions = useClassSessions(classId);
  const summary = useMyAttendanceSummary(classId);
  const [mode, setMode] = useState<ModeFilter>("all");
  const [search, setSearch] = useState("");
  const [leaveFor, setLeaveFor] = useState<ClassSession | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const all = sessions.data ?? [];
  const nearest = pickNearestSession(all);
  const needle = fold(search.trim());
  const rows = all.filter((s) => (mode === "all" || s.mode === mode) && matches(s, needle));

  return (
    <div className="space-y-6">
      <AttendanceStats summary={summary.data} loading={summary.isPending} error={summary.error} onRetry={() => summary.refetch()} />

      {sessions.isPending ? <Skeleton className="h-[136px] w-full rounded-xl" />
        : nearest ? <NearestSession session={nearest} onRequestLeave={setLeaveFor} /> : null}

      <section aria-labelledby="session-list-title" className="space-y-3">
        <h2 id="session-list-title" className="sr-only">Danh sách buổi học</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => setHistoryOpen(true)}><FileClock aria-hidden /> Đơn xin nghỉ học</Button>
          <ToggleGroup type="single" value={mode} onValueChange={(value) => value && setMode(value as ModeFilter)} aria-label="Lọc theo hình thức">
            <ToggleGroupItem value="all">Tất cả</ToggleGroupItem>
            <ToggleGroupItem value="in_person">Trực tiếp</ToggleGroupItem>
            <ToggleGroupItem value="online">Online</ToggleGroupItem>
          </ToggleGroup>
          <SearchField value={search} onChange={setSearch} placeholder="Tìm ngày, phòng, tiêu đề…" className="w-full sm:w-64" />
          <p className="ml-auto text-sm text-muted-foreground">
            Tổng số: <span className="font-semibold text-primary tabular-nums">{sessions.data ? rows.length : "…"}</span>
          </p>
        </div>
        {sessions.isPending ? <div className="rounded-xl border"><TableSkeleton rows={6} cols={7} /></div>
          : sessions.isError ? <ErrorState error={sessions.error} onRetry={() => sessions.refetch()} />
          : rows.length === 0 ? (
            <EmptyState icon={CalendarX} className="rounded-xl border"
              title={all.length === 0 ? "Lớp chưa có lịch học" : "Không có buổi học phù hợp"}
              description={all.length === 0 ? "Giảng viên sẽ cập nhật lịch các buổi học tại đây." : "Thử bỏ bộ lọc hoặc đổi từ khóa tìm kiếm."} />
          ) : <SessionsTable classId={classId} sessions={rows} nextId={nearest?.id} onRequestLeave={setLeaveFor} />}
      </section>

      {leaveFor ? <LeaveRequestDialog classId={classId} clazz={clazz} session={leaveFor} onOpenChange={(open) => { if (!open) setLeaveFor(null); }} /> : null}
      {historyOpen ? <LeaveHistoryDialog classId={classId} clazz={clazz} onOpenChange={setHistoryOpen} /> : null}
    </div>
  );
}
