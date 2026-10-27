import { useParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, TableSkeleton } from "@/components/state-blocks";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { AttendanceEditor } from "./attendance-editor";
import { useSessionAttendance } from "./use-session-attendance";
import { useSessions } from "./use-schedule";

/** Trang điểm danh một buổi `/classes/:classId/sessions/:sessionId` (class-schedule-grades-spec §3). */
export function SessionAttendancePage() {
  const { classId = "", sessionId = "" } = useParams();
  const { status: guard } = useAuthGuard(["admin", "lecturer"]);
  const id = Number(sessionId);
  const attendance = useSessionAttendance(id);
  const sessions = useSessions(classId);
  if (guard !== "ok") return null;

  if (attendance.isPending) {
    return (
      <div data-layout="wide" className="mx-auto w-full max-w-6xl space-y-6" aria-busy="true" aria-label="Đang tải buổi học">
        <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-7 w-72" /><Skeleton className="h-4 w-96 max-w-full" /></div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[4.75rem] rounded-xl" />)}
        </div>
        <TableSkeleton cols={5} rows={5} />
      </div>
    );
  }
  if (attendance.isError) return <ErrorState error={attendance.error} onRetry={() => attendance.refetch()} />;

  const data = attendance.data;
  const list = (sessions.data ?? []).filter((s) => !s.is_cancelled || s.id === id);
  const index = list.findIndex((s) => s.id === id);
  // Đổi trạng thái đơn xin nghỉ (duyệt ngay tại trang) → nạp lại bản nháp theo dữ liệu mới.
  const leaveKey = data.items.map((row) => row.leave_request?.status ?? "-").join("");

  return (
    <AttendanceEditor key={`${id}-${leaveKey}`} classId={classId} data={data}
      prev={index > 0 ? list[index - 1] : undefined}
      next={index >= 0 && index < list.length - 1 ? list[index + 1] : undefined} />
  );
}
