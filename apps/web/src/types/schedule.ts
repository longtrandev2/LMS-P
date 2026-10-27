// Hợp đồng lịch học, điểm danh, đơn xin nghỉ — docs/class-schedule-grades-spec.md §2–4, docs/api-spec.md §11.
export type SessionMode = "in_person" | "online";
export type AttendanceStatus = "present" | "late" | "excused" | "absent";
export type LeaveRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface LeaveRequest {
  id: number;
  class_id: number;
  session_id: number;
  session_date: string;
  start_period: number;
  end_period: number;
  student_id: number;
  student_code?: string | null;
  full_name: string;
  reason: string;
  evidence_name: string;
  evidence_size: number;
  status: LeaveRequestStatus;
  review_note?: string | null;
  reviewed_by_name?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}
export interface ClassSession {
  id: number;
  class_id: number;
  session_no: number;
  /** Ngày lịch VN, `YYYY-MM-DD`. */
  date: string;
  start_period: number;
  end_period: number;
  /** UTC không hậu tố (quy ước chung). */
  starts_at: string;
  ends_at: string;
  room?: string | null;
  mode: SessionMode;
  title?: string | null;
  note?: string | null;
  is_cancelled: boolean;
  attendance_taken_at?: string | null;
  lecturer_name?: string | null;
  materials: { id: number; title: string; type: string }[];
  /** Chỉ khi người gọi là sinh viên. */
  my_status?: AttendanceStatus | null;
  my_leave_request?: LeaveRequest | null;
}
export interface SessionPattern {
  /** 1 = Thứ 2 … 7 = Chủ nhật. */
  weekday: number;
  start_period: number;
  end_period: number;
  room?: string | null;
  mode: SessionMode;
}
export interface GenerateSessionsInput {
  from: string;
  to: string;
  patterns: SessionPattern[];
  replace_unmarked: boolean;
}
export interface AttendanceSummary {
  total: number;
  present: number;
  late: number;
  excused: number;
  absent: number;
  unmarked: number;
  max_absences?: number;
  eligible?: boolean;
}
export interface AttendanceRow {
  student_id: number;
  student_code?: string | null;
  full_name: string;
  status: AttendanceStatus | null;
  note?: string | null;
  leave_request?: LeaveRequest | null;
}
export interface SessionAttendance {
  session: ClassSession;
  items: AttendanceRow[];
  summary: AttendanceSummary;
}
export interface ClassAttendanceSummary {
  total_sessions: number;
  taken_sessions: number;
  items: ({ student_id: number; student_code?: string | null; full_name: string } & AttendanceSummary)[];
}
