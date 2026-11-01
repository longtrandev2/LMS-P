import { Link } from "react-router-dom";
import { ClipboardCheck, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { periodRange, sessionDateLabel } from "@/lib/schedule";
import type { ClassSession } from "@/types/api";
import { SessionModeBadge, SessionStateBadge } from "./session-badges";

/** Khối "Buổi học gần nhất": ngày, tiết + giờ, phòng, hình thức, trạng thái và nút đỏ "Điểm danh". */
export function NearestSessionPanel({ classId, session }: { classId: string; session: ClassSession }) {
  return (
    <section aria-labelledby="nearest-session" className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl border px-5 py-4">
      <div className="min-w-0 space-y-1.5">
        <h2 id="nearest-session" className="text-xs text-muted-foreground">
          Buổi học gần nhất · <span className="tabular-nums">Buổi {session.session_no}</span>
        </h2>
        <p className="text-base font-semibold">
          {sessionDateLabel(session.date)}
          {session.title ? <span className="font-normal text-muted-foreground"> — {session.title}</span> : null}
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-foreground/80">
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <Clock className="size-4 text-muted-foreground" strokeWidth={1.75} aria-hidden />
            Tiết {session.start_period}–{session.end_period} ({periodRange(session.start_period, session.end_period)})
          </span>
          {session.room ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4 text-muted-foreground" strokeWidth={1.75} aria-hidden /> {session.room}
            </span>
          ) : null}
          <SessionModeBadge mode={session.mode} />
          <SessionStateBadge session={session} />
        </div>
      </div>
      <Button asChild>
        <Link to={`/classes/${classId}/sessions/${session.id}`}>
          <ClipboardCheck aria-hidden /> {session.attendance_taken_at ? "Sửa điểm danh" : "Điểm danh"}
        </Link>
      </Button>
    </section>
  );
}
