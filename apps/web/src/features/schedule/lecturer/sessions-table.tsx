import { Paperclip } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { periodRange, sessionDateLabel } from "@/lib/schedule";
import type { ClassSession } from "@/types/api";
import { SessionModeBadge, SessionStateBadge } from "./session-badges";
import { SessionRowActions } from "./session-row-actions";

/** Header bảng nghiệp vụ (DESIGN.md §4): nền xám nhạt, chữ 13/500, bo hai đầu. */
export const BUSINESS_TABLE =
  "[&_thead_tr]:border-0 [&_th]:h-10 [&_th]:bg-secondary/60 [&_th]:text-[13px] [&_th:first-child]:rounded-l-lg [&_th:last-child]:rounded-r-lg";

/** Bảng buổi học kiểu S-Link: TT · Ngày học · Tiết · Phòng · Hình thức · Điểm danh · Tiêu đề · Học liệu · Thao tác. */
export function SessionsTable({ classId, sessions, onEdit }: {
  classId: string; sessions: ClassSession[]; onEdit: (session: ClassSession) => void;
}) {
  return (
    <Table className={BUSINESS_TABLE}>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12 text-center">TT</TableHead>
          <TableHead>Ngày học</TableHead>
          <TableHead>Tiết</TableHead>
          <TableHead>Phòng</TableHead>
          <TableHead>Hình thức</TableHead>
          <TableHead>Điểm danh</TableHead>
          <TableHead>Tiêu đề</TableHead>
          <TableHead>Học liệu</TableHead>
          <TableHead className="text-right">Thao tác</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sessions.map((session) => (
          <TableRow key={session.id} className={cn(session.is_cancelled && "text-muted-foreground")}>
            <TableCell className="text-center tabular-nums text-muted-foreground">{session.session_no}</TableCell>
            <TableCell className="font-medium tabular-nums">{sessionDateLabel(session.date)}</TableCell>
            <TableCell className="tabular-nums">
              {session.start_period}–{session.end_period}
              <span className="ml-1.5 text-xs text-muted-foreground">{periodRange(session.start_period, session.end_period)}</span>
            </TableCell>
            <TableCell>{session.room || "—"}</TableCell>
            <TableCell><SessionModeBadge mode={session.mode} /></TableCell>
            <TableCell><SessionStateBadge session={session} /></TableCell>
            <TableCell className="max-w-56 truncate" title={session.title ?? undefined}>{session.title || <span className="text-muted-foreground">—</span>}</TableCell>
            <TableCell>
              {session.materials.length ? (
                <span className="inline-flex items-center gap-1 text-foreground/80" title={session.materials.map((m) => m.title).join("\n")}>
                  <Paperclip className="size-3.5 text-muted-foreground" aria-hidden />
                  <span className="max-w-40 truncate">{session.materials.length === 1 ? session.materials[0].title : `${session.materials.length} học liệu`}</span>
                </span>
              ) : <span className="text-muted-foreground">—</span>}
            </TableCell>
            <TableCell><SessionRowActions classId={classId} session={session} onEdit={onEdit} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
