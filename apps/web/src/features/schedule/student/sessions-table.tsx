import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { periodRange } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import type { ClassSession } from "@/types/api";
import { periodLabel, shortDate, weekdayOf } from "./schedule-format";
import { AttendanceCell, LeaveStatusBadge, ModeBadge } from "./session-badges";
import { SessionMaterials } from "./session-materials";
import { canRequestLeave } from "./use-student-schedule";

const HEAD = "h-10 text-[13px] font-medium text-foreground/70";

function ActionCell({ session, onRequestLeave, now }: { session: ClassSession; onRequestLeave: (s: ClassSession) => void; now: number }) {
  const request = session.my_leave_request;
  const allowed = canRequestLeave(session, now);
  if (!request && !allowed) return <span className="block text-center text-muted-foreground">—</span>;
  return (
    <div className="flex items-center justify-center gap-1.5">
      {request ? <LeaveStatusBadge status={request.status} /> : null}
      {allowed ? (
        <Button variant="ghost" size="icon-sm" onClick={() => onRequestLeave(session)}
          aria-label={`Xin nghỉ buổi ${session.session_no}`} title="Đăng ký xin nghỉ"
          className="text-muted-foreground hover:text-primary">
          <Mail aria-hidden />
        </Button>
      ) : null}
    </div>
  );
}

/** Bảng buổi học (DESIGN.md v3.1 "Bảng dữ liệu nghiệp vụ"): header nền xám, cột TT căn giữa, badge tô nhạt, cột thao tác icon. */
export function SessionsTable({ classId, sessions, nextId, onRequestLeave }: {
  classId: string;
  sessions: ClassSession[];
  /** Buổi kế tiếp — tô nền nhạt để dễ tìm. */
  nextId?: number;
  onRequestLeave: (session: ClassSession) => void;
}) {
  const now = Date.now();
  return (
    <div className="overflow-hidden rounded-xl border">
      <Table className="min-w-[1080px]">
        <TableHeader>
          <TableRow className="bg-secondary/60 hover:bg-secondary/60">
            <TableHead className={cn(HEAD, "w-12 text-center first:pl-3")}>TT</TableHead>
            <TableHead className={HEAD}>Ngày học</TableHead>
            <TableHead className={HEAD}>Tiết</TableHead>
            <TableHead className={HEAD}>Phòng</TableHead>
            <TableHead className={HEAD}>Hình thức</TableHead>
            <TableHead className={HEAD}>Điểm danh</TableHead>
            <TableHead className={HEAD}>Giảng viên</TableHead>
            <TableHead className={HEAD}>Tiêu đề</TableHead>
            <TableHead className={HEAD}>Học liệu</TableHead>
            <TableHead className={cn(HEAD, "text-center")}>Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((session) => (
            <TableRow key={session.id}
              className={cn(session.is_cancelled && "text-muted-foreground", session.id === nextId && "bg-brand-soft/60 hover:bg-brand-soft")}>
              <TableCell className="text-center text-muted-foreground tabular-nums first:pl-3">{session.session_no}</TableCell>
              <TableCell>
                <span className={cn("block font-medium tabular-nums", session.is_cancelled && "line-through")}>{shortDate(session.date)}</span>
                <span className="block text-xs text-muted-foreground">{weekdayOf(session.date)}</span>
              </TableCell>
              <TableCell>
                <span className="block tabular-nums">{periodLabel(session.start_period, session.end_period)}</span>
                <span className="block text-xs text-muted-foreground tabular-nums">{periodRange(session.start_period, session.end_period)}</span>
              </TableCell>
              <TableCell>{session.room || <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell><ModeBadge mode={session.mode} /></TableCell>
              <TableCell><AttendanceCell session={session} now={now} /></TableCell>
              <TableCell className="max-w-40 truncate">{session.lecturer_name ?? "—"}</TableCell>
              <TableCell className="max-w-56 truncate whitespace-normal">
                {session.title ? <span className="line-clamp-2">{session.title}</span> : <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="whitespace-normal"><SessionMaterials classId={classId} items={session.materials} /></TableCell>
              <TableCell><ActionCell session={session} onRequestLeave={onRequestLeave} now={now} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
