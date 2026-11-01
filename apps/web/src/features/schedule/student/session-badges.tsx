import { Monitor, School } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { utcDateTimeMillis } from "@/lib/date-time";
import { ATTENDANCE_LABEL, LEAVE_STATUS_LABEL, LEAVE_STATUS_TONE, SESSION_MODE_LABEL } from "@/lib/schedule";
import type { ClassSession, LeaveRequestStatus, SessionMode } from "@/types/api";
import { ATTENDANCE_BADGE } from "./schedule-format";

export function ModeBadge({ mode }: { mode: SessionMode }) {
  const Icon = mode === "online" ? Monitor : School;
  return (
    <Badge variant={mode === "online" ? "info" : "default"}>
      <Icon aria-hidden />{SESSION_MODE_LABEL[mode]}
    </Badge>
  );
}

export function LeaveStatusBadge({ status }: { status: LeaveRequestStatus }) {
  return <Badge variant={LEAVE_STATUS_TONE[status]}>{status === "pending" ? "Đơn chờ duyệt" : LEAVE_STATUS_LABEL[status]}</Badge>;
}

/** Trạng thái điểm danh của sinh viên ở một buổi: hủy · đã điểm danh · chưa điểm danh (đã diễn ra) · chưa học. */
export function AttendanceCell({ session, now = Date.now() }: { session: ClassSession; now?: number }) {
  if (session.is_cancelled) return <Badge variant="secondary">Buổi hủy</Badge>;
  if (session.my_status) return <Badge variant={ATTENDANCE_BADGE[session.my_status]}>{ATTENDANCE_LABEL[session.my_status]}</Badge>;
  if (utcDateTimeMillis(session.starts_at) > now) return <span className="text-xs text-muted-foreground">Chưa diễn ra</span>;
  return <Badge variant="default">Chưa điểm danh</Badge>;
}
