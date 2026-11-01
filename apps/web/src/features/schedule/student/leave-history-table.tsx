import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBytes } from "@/features/materials/format";
import { errorText } from "@/lib/error-messages";
import { periodRange } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import type { LeaveRequest } from "@/types/api";
import { localDateTime, periodLabel, shortDate, weekdayOf } from "./schedule-format";
import { LeaveStatusBadge } from "./session-badges";
import { downloadEvidence } from "./use-student-schedule";

const HEAD = "h-10 text-[13px] font-medium text-foreground/70";

function EvidenceLink({ request }: { request: LeaveRequest }) {
  const [busy, setBusy] = useState(false);
  async function open() {
    setBusy(true);
    try { await downloadEvidence(request); } catch (error) { toast.error(errorText(error)); } finally { setBusy(false); }
  }
  return (
    <button type="button" onClick={open} disabled={busy} title={request.evidence_name}
      className="inline-flex max-w-44 items-center gap-1.5 rounded-sm text-left text-[13px] underline-offset-4 outline-none hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring">
      {busy ? <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden /> : <Paperclip className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />}
      <span className="truncate">{request.evidence_name}</span>
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{formatBytes(request.evidence_size)}</span>
    </button>
  );
}

/** Bảng lịch sử đơn xin nghỉ của sinh viên trong lớp; đơn chờ duyệt có nút Hủy. */
export function LeaveHistoryTable({ items, onCancel, cancellingId }: {
  items: LeaveRequest[];
  onCancel: (request: LeaveRequest) => void;
  cancellingId: number | null;
}) {
  return (
    <div className="overflow-hidden rounded-xl border">
      <Table className="min-w-[860px]">
        <TableHeader>
          <TableRow className="bg-secondary/60 hover:bg-secondary/60">
            <TableHead className={cn(HEAD, "w-12 text-center first:pl-3")}>TT</TableHead>
            <TableHead className={HEAD}>Ngày nghỉ</TableHead>
            <TableHead className={HEAD}>Ca (tiết)</TableHead>
            <TableHead className={HEAD}>Lý do</TableHead>
            <TableHead className={HEAD}>Minh chứng</TableHead>
            <TableHead className={HEAD}>Trạng thái</TableHead>
            <TableHead className={HEAD}>Ngày gửi</TableHead>
            <TableHead className={cn(HEAD, "text-center")}>Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((request, index) => (
            <TableRow key={request.id}>
              <TableCell className="text-center text-muted-foreground tabular-nums first:pl-3">{index + 1}</TableCell>
              <TableCell>
                <span className="block font-medium tabular-nums">{shortDate(request.session_date)}</span>
                <span className="block text-xs text-muted-foreground">{weekdayOf(request.session_date)}</span>
              </TableCell>
              <TableCell>
                <span className="block tabular-nums">{periodLabel(request.start_period, request.end_period)}</span>
                <span className="block text-xs text-muted-foreground tabular-nums">{periodRange(request.start_period, request.end_period)}</span>
              </TableCell>
              <TableCell className="max-w-64 whitespace-normal">
                <span className="line-clamp-2" title={request.reason}>{request.reason}</span>
                {request.review_note ? (
                  <span className="mt-0.5 block text-xs text-muted-foreground">GV: {request.review_note}</span>
                ) : null}
              </TableCell>
              <TableCell><EvidenceLink request={request} /></TableCell>
              <TableCell><LeaveStatusBadge status={request.status} /></TableCell>
              <TableCell className="text-[13px] text-muted-foreground tabular-nums">{localDateTime(request.created_at)}</TableCell>
              <TableCell className="text-center">
                {request.status === "pending" ? (
                  <Button variant="secondary" size="xs" onClick={() => onCancel(request)} disabled={cancellingId === request.id}>
                    {cancellingId === request.id ? <Loader2 className="animate-spin" aria-hidden /> : null} Hủy đơn
                  </Button>
                ) : <span className="text-muted-foreground">—</span>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
