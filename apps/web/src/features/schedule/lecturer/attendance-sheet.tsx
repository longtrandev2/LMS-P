import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LEAVE_STATUS_LABEL, LEAVE_STATUS_TONE } from "@/lib/schedule";
import type { AttendanceRow, LeaveRequest } from "@/types/api";
import { AttendanceStatusToggle } from "./attendance-status-toggle";
import { BUSINESS_TABLE } from "./sessions-table";
import type { AttendanceDraft, DraftRecord } from "./use-session-attendance";

interface SheetProps {
  rows: AttendanceRow[];
  draft: AttendanceDraft;
  disabled?: boolean;
  onChange: (studentId: number, patch: Partial<DraftRecord>) => void;
  onOpenLeave: (request: LeaveRequest) => void;
}

function LeaveLink({ request, onOpen }: { request: LeaveRequest; onOpen: (request: LeaveRequest) => void }) {
  return (
    <button type="button" onClick={() => onOpen(request)}
      className="inline-flex items-center gap-1.5 rounded-sm text-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
      <Badge variant={LEAVE_STATUS_TONE[request.status]}>Đơn: {LEAVE_STATUS_LABEL[request.status]}</Badge>
      <span className="text-muted-foreground">Xem đơn</span>
    </button>
  );
}

/** Màn hẹp: mỗi sinh viên một khối (tên · mã · đơn) → 4 nút trạng thái giãn đủ rộng → ghi chú. */
function AttendanceList({ rows, draft, disabled, onChange, onOpenLeave }: SheetProps) {
  return (
    <ul className="divide-y border-y sm:hidden">
      {rows.map((row, index) => {
        const record = draft[row.student_id] ?? { status: null, note: "" };
        return (
          <li key={row.student_id} className="space-y-2 py-3">
            <div className="flex items-baseline gap-2">
              <span className="w-5 text-xs text-muted-foreground tabular-nums">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate font-medium">{row.full_name}</span>
              <span className="font-mono text-xs text-muted-foreground">{row.student_code}</span>
            </div>
            {row.leave_request ? <LeaveLink request={row.leave_request} onOpen={onOpenLeave} /> : null}
            <AttendanceStatusToggle label={`Trạng thái điểm danh của ${row.full_name}`} value={record.status} disabled={disabled}
              className="w-full [&>*]:flex-1" onChange={(status) => onChange(row.student_id, { status })} />
            <Input aria-label={`Ghi chú cho ${row.full_name}`} className="h-7" placeholder="Ghi chú" maxLength={255}
              value={record.note} disabled={disabled} onChange={(e) => onChange(row.student_id, { note: e.target.value })} />
          </li>
        );
      })}
    </ul>
  );
}

/** Màn rộng: bảng STT · Mã SV · Họ tên · trạng thái (4 nút) · ghi chú · đơn xin nghỉ. */
function AttendanceTable({ rows, draft, disabled, onChange, onOpenLeave }: SheetProps) {
  return (
    <Table className={BUSINESS_TABLE}>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12 text-center">STT</TableHead>
          <TableHead>Mã SV</TableHead>
          <TableHead>Họ tên</TableHead>
          <TableHead>Trạng thái</TableHead>
          <TableHead className="min-w-48">Ghi chú</TableHead>
          <TableHead>Đơn xin nghỉ</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => {
          const record = draft[row.student_id] ?? { status: null, note: "" };
          return (
            <TableRow key={row.student_id}>
              <TableCell className="text-center text-muted-foreground tabular-nums">{index + 1}</TableCell>
              <TableCell className="font-mono text-xs">{row.student_code ?? "—"}</TableCell>
              <TableCell className="font-medium">{row.full_name}</TableCell>
              <TableCell>
                <AttendanceStatusToggle label={`Trạng thái điểm danh của ${row.full_name}`} value={record.status} disabled={disabled}
                  onChange={(status) => onChange(row.student_id, { status })} />
              </TableCell>
              <TableCell>
                <Input aria-label={`Ghi chú cho ${row.full_name}`} className="h-7 min-w-48" placeholder="Ghi chú" maxLength={255}
                  value={record.note} disabled={disabled} onChange={(e) => onChange(row.student_id, { note: e.target.value })} />
              </TableCell>
              <TableCell>
                {row.leave_request ? <LeaveLink request={row.leave_request} onOpen={onOpenLeave} /> : <span className="text-muted-foreground">—</span>}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

/** Danh sách điểm danh: bảng ở màn rộng, dạng khối ở màn hẹp (390px không cuộn ngang). */
export function AttendanceSheet(props: SheetProps) {
  return (
    <>
      <AttendanceList {...props} />
      <div className="hidden sm:block"><AttendanceTable {...props} /></div>
    </>
  );
}
