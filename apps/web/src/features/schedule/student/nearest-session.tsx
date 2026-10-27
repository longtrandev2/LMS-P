import { CalendarClock, MapPin, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { periodRange } from "@/lib/schedule";
import { utcDateTimeMillis } from "@/lib/date-time";
import type { ClassSession } from "@/types/api";
import { periodLabel, shortDate, weekdayOf } from "./schedule-format";
import { AttendanceCell, LeaveStatusBadge, ModeBadge } from "./session-badges";
import { canRequestLeave } from "./use-student-schedule";

/** Buổi gần nhất: buổi chưa kết thúc sớm nhất (không hủy); hết lịch thì lấy buổi cuối cùng. */
export function pickNearestSession(sessions: ClassSession[], now = Date.now()): ClassSession | undefined {
  const active = sessions.filter((s) => !s.is_cancelled);
  return active.find((s) => utcDateTimeMillis(s.ends_at) >= now) ?? active.at(-1);
}

function relativeDay(session: ClassSession, now: number): string | null {
  const start = utcDateTimeMillis(session.starts_at), end = utcDateTimeMillis(session.ends_at);
  if (now >= start && now <= end) return "Đang diễn ra";
  if (start < now) return null;
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const days = Math.round((new Date(start).setHours(0, 0, 0, 0) - today.getTime()) / 86_400_000);
  return days === 0 ? "Hôm nay" : days === 1 ? "Ngày mai" : `Còn ${days} ngày`;
}

/** Khối "Buổi học gần nhất" phía trên bảng: ngày, tiết + giờ, phòng, hình thức, giảng viên, điểm danh. */
export function NearestSession({ session, onRequestLeave }: { session: ClassSession; onRequestLeave: (s: ClassSession) => void }) {
  const now = Date.now();
  const tag = relativeDay(session, now);
  return (
    <section aria-labelledby="nearest-session" className="rounded-xl border p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="nearest-session" className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            Buổi học gần nhất
            {tag ? <Badge variant={tag === "Đang diễn ra" ? "success" : "default"}>{tag}</Badge> : null}
          </h2>
          <p className="mt-2 text-lg font-semibold tabular-nums">
            {weekdayOf(session.date)}, {shortDate(session.date)}
            <span className="ml-2 text-sm font-normal text-muted-foreground">Buổi {session.session_no}</span>
          </p>
          {session.title ? <p className="mt-0.5 text-sm text-muted-foreground">{session.title}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          {session.my_leave_request ? <LeaveStatusBadge status={session.my_leave_request.status} /> : null}
          {canRequestLeave(session, now) ? (
            <Button variant="secondary" size="sm" onClick={() => onRequestLeave(session)}>Xin nghỉ buổi này</Button>
          ) : null}
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-5">
        <div><dt className="text-xs text-muted-foreground">Tiết học</dt>
          <dd className="mt-1 flex items-center gap-1.5 font-medium tabular-nums">
            <CalendarClock className="size-4 text-muted-foreground" strokeWidth={1.75} aria-hidden />
            {periodLabel(session.start_period, session.end_period)}
          </dd>
          <dd className="mt-0.5 pl-5.5 text-xs text-muted-foreground tabular-nums">{periodRange(session.start_period, session.end_period)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Phòng</dt>
          <dd className="mt-1 flex items-center gap-1.5 font-medium">
            <MapPin className="size-4 text-muted-foreground" strokeWidth={1.75} aria-hidden />{session.room || "—"}
          </dd></div>
        <div><dt className="text-xs text-muted-foreground">Hình thức</dt><dd className="mt-1"><ModeBadge mode={session.mode} /></dd></div>
        <div><dt className="text-xs text-muted-foreground">Giảng viên</dt>
          <dd className="mt-1 flex min-w-0 items-center gap-1.5 font-medium">
            <UserRound className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden />
            <span className="truncate">{session.lecturer_name ?? "—"}</span>
          </dd></div>
        <div><dt className="text-xs text-muted-foreground">Điểm danh</dt><dd className="mt-1"><AttendanceCell session={session} now={now} /></dd></div>
      </dl>
    </section>
  );
}
