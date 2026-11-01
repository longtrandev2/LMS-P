import { useState } from "react";
import { Hand, History, TimerReset } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { MonitorRow } from "@/types/exams";
import { EventsSheet } from "./events-sheet";
import { ExtendDialog } from "./extend-dialog";
import { ForceSubmitDialog } from "./force-submit-dialog";
import { ConnectionCell, FocusLostCell, ProgressCell, RemainingCell, ScoreCell } from "./monitor-cells";
import { MONITOR_STATUS_BADGE, MONITOR_STATUS_LABEL, SUBMIT_REASON_LABEL } from "./monitor-labels";

/** Header bảng nghiệp vụ (DESIGN.md §4): nền xám nhạt, chữ 13/500, bo hai đầu. */
const BUSINESS_TABLE =
  "[&_thead_tr]:border-0 [&_th]:h-10 [&_th]:bg-secondary/60 [&_th]:text-[13px] [&_th:first-child]:rounded-l-lg [&_th:last-child]:rounded-r-lg";

type Action = { kind: "extend" | "force" | "events"; row: MonitorRow };

/** Bảng giám sát (exam-spec §8.3): mỗi sinh viên một dòng, hành động theo trạng thái phiên. */
export function MonitorTable({ assignmentId, rows, serverNow }: { assignmentId: number; rows: MonitorRow[]; serverNow: number }) {
  const [action, setAction] = useState<Action | null>(null);
  const close = () => setAction(null);
  return <>
    <Table className={BUSINESS_TABLE}>
      <TableHeader>
        <TableRow>
          <TableHead className="min-w-48">Sinh viên</TableHead>
          <TableHead>Mã đề</TableHead>
          <TableHead>Trạng thái</TableHead>
          <TableHead className="min-w-20">Còn lại</TableHead>
          <TableHead>Tiến độ</TableHead>
          <TableHead>Rời trang</TableHead>
          <TableHead className="min-w-28">Kết nối</TableHead>
          <TableHead className="text-right">Điểm</TableHead>
          {/* Rộng cố định để bảng không nhảy cột khi trạng thái đổi giữa các lần làm mới. */}
          <TableHead className="w-56 text-right">Thao tác</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => <TableRow key={row.student_id}>
          <TableCell>
            <p className="font-medium">{row.student_full_name}</p>
            <p className="font-mono text-xs text-muted-foreground">{row.student_code ?? `ID ${row.student_id}`}</p>
          </TableCell>
          <TableCell className="font-mono text-sm tabular-nums">{row.paper_code ?? <span className="font-sans text-muted-foreground">—</span>}</TableCell>
          <TableCell>
            <div className="flex flex-col items-start gap-0.5">
              <Badge variant={MONITOR_STATUS_BADGE[row.status]}>{MONITOR_STATUS_LABEL[row.status]}</Badge>
              {row.submit_reason ? <span className="text-xs text-muted-foreground">{SUBMIT_REASON_LABEL[row.submit_reason]}</span> : null}
            </div>
          </TableCell>
          <TableCell><RemainingCell row={row} serverNow={serverNow} /></TableCell>
          <TableCell><ProgressCell row={row} /></TableCell>
          <TableCell><FocusLostCell row={row} /></TableCell>
          <TableCell><ConnectionCell row={row} serverNow={serverNow} /></TableCell>
          <TableCell className="text-right"><ScoreCell row={row} /></TableCell>
          <TableCell>
            <div className="flex items-center justify-end gap-0.5">
              {row.status === "in_progress" ? <>
                <Button variant="ghost" size="sm" onClick={() => setAction({ kind: "extend", row })} aria-label={`Gia hạn cho ${row.student_full_name}`}>
                  <TimerReset aria-hidden />Gia hạn
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setAction({ kind: "force", row })} aria-label={`Thu bài của ${row.student_full_name}`}>
                  <Hand aria-hidden />Thu bài
                </Button>
              </> : null}
              {row.session_id != null ? <Button variant="ghost" size="icon-sm" title="Sự kiện" onClick={() => setAction({ kind: "events", row })}
                aria-label={`Sự kiện phiên của ${row.student_full_name}`}>
                <History aria-hidden />
              </Button> : null}
            </div>
          </TableCell>
        </TableRow>)}
      </TableBody>
    </Table>
    {action?.kind === "extend" ? <ExtendDialog assignmentId={assignmentId} row={action.row} onClose={close} /> : null}
    {action?.kind === "force" ? <ForceSubmitDialog assignmentId={assignmentId} row={action.row} onClose={close} /> : null}
    {action?.kind === "events" ? <EventsSheet row={action.row} onClose={close} /> : null}
  </>;
}
