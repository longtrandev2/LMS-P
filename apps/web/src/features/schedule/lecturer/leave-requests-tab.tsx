import { useState } from "react";
import { FileText, Inbox } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/state-blocks";
import { utcDateTimeMillis } from "@/lib/date-time";
import { errorText } from "@/lib/error-messages";
import { LEAVE_STATUS_LABEL, LEAVE_STATUS_TONE, sessionDateLabel } from "@/lib/schedule";
import type { LeaveRequest, LeaveRequestStatus } from "@/types/api";
import { LeaveReviewDialog } from "./leave-review-dialog";
import { BUSINESS_TABLE } from "./sessions-table";
import { downloadEvidence, useLeaveRequests } from "./use-leave-requests";

type Filter = "all" | LeaveRequestStatus;
const FILTERS: Filter[] = ["pending", "approved", "rejected", "cancelled", "all"];
const formatSent = (value: string) => new Date(utcDateTimeMillis(value)).toLocaleString("vi-VN", {
  hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric",
});

/** Tab Đơn xin nghỉ: lọc trạng thái (segmented) → bảng đơn; đơn chờ có Duyệt (đỏ) / Từ chối (xám). */
export function LeaveRequestsTab({ classId }: { classId: string }) {
  const [filter, setFilter] = useState<Filter>("pending");
  const query = useLeaveRequests(classId, filter === "all" ? undefined : filter);
  const [open, setOpen] = useState<{ request: LeaveRequest; intent?: "approved" | "rejected" } | null>(null);
  const items = query.data?.items ?? [];

  async function download(request: LeaveRequest) {
    try { await downloadEvidence(request); } catch (e) { toast.error(errorText(e)); }
  }

  return (
    <section aria-label="Đơn xin nghỉ" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="max-w-full overflow-x-auto">
          <ToggleGroup type="single" size="sm" value={filter} onValueChange={(v) => v && setFilter(v as Filter)} aria-label="Lọc theo trạng thái">
            {FILTERS.map((f) => <ToggleGroupItem key={f} value={f}>{f === "all" ? "Tất cả" : LEAVE_STATUS_LABEL[f]}</ToggleGroupItem>)}
          </ToggleGroup>
        </div>
        <span className="text-sm text-muted-foreground">Tổng số: <strong className="font-semibold text-primary tabular-nums">{query.data?.total ?? 0}</strong></span>
      </div>
      {query.isPending ? <TableSkeleton cols={6} rows={3} />
        : query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} />
        : items.length === 0 ? (
          <EmptyState compact icon={Inbox} title={filter === "pending" ? "Không có đơn nào đang chờ" : "Không có đơn phù hợp"}
            description="Sinh viên gửi đơn xin nghỉ cho từng buổi kèm minh chứng; đơn mới sẽ hiện ở đây." />
        ) : (
          <Table className={BUSINESS_TABLE}>
            <TableHeader><TableRow>
              <TableHead>Sinh viên</TableHead><TableHead>Buổi</TableHead><TableHead>Lý do</TableHead><TableHead>Minh chứng</TableHead>
              <TableHead>Trạng thái</TableHead><TableHead>Ngày gửi</TableHead><TableHead className="text-right">Thao tác</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.full_name}</div>
                    {r.student_code ? <div className="font-mono text-xs text-muted-foreground">{r.student_code}</div> : null}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    <div>{sessionDateLabel(r.session_date)}</div>
                    <div className="text-xs text-muted-foreground">Tiết {r.start_period}–{r.end_period}</div>
                  </TableCell>
                  <TableCell className="max-w-64 min-w-40 whitespace-normal">
                    <button type="button" className="line-clamp-2 text-left hover:underline" onClick={() => setOpen({ request: r })}>{r.reason}</button>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="-ml-2 max-w-44" onClick={() => download(r)} aria-label={`Tải minh chứng ${r.evidence_name}`}>
                      <FileText aria-hidden /> <span className="truncate">{r.evidence_name}</span>
                    </Button>
                  </TableCell>
                  <TableCell><Badge variant={LEAVE_STATUS_TONE[r.status]}>{LEAVE_STATUS_LABEL[r.status]}</Badge></TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">{formatSent(r.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1.5">
                      {r.status === "pending" ? (
                        <>
                          <Button size="sm" onClick={() => setOpen({ request: r, intent: "approved" })}>Duyệt</Button>
                          <Button size="sm" variant="secondary" onClick={() => setOpen({ request: r, intent: "rejected" })}>Từ chối</Button>
                        </>
                      ) : <Button size="sm" variant="ghost" onClick={() => setOpen({ request: r })}>Xem</Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      {open ? <LeaveReviewDialog classId={classId} request={open.request} intent={open.intent} onOpenChange={(v) => { if (!v) setOpen(null); }} /> : null}
    </section>
  );
}
