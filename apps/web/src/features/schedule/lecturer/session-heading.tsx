import { ChevronLeft, ChevronRight, Clock, MapPin, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { periodRange, sessionDateLabel } from "@/lib/schedule";
import type { ClassSession } from "@/types/api";
import { SessionModeBadge, SessionStateBadge } from "./session-badges";

/** Đầu trang điểm danh: "Buổi n" + ngày, hàng meta (tiết–giờ · phòng · hình thức · trạng thái), điều hướng buổi trước/sau. */
export function SessionHeading({ session, prev, next, onNavigate }: {
  session: ClassSession; prev?: ClassSession; next?: ClassSession; onNavigate: (session: ClassSession) => void;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="min-w-0 space-y-2">
        <p className="text-sm text-muted-foreground tabular-nums">Điểm danh · Buổi {session.session_no}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          {sessionDateLabel(session.date)}
          {session.title ? <span className="font-normal text-muted-foreground"> — {session.title}</span> : null}
        </h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-foreground/80">
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <Clock className="size-4 text-muted-foreground" strokeWidth={1.75} aria-hidden />
            Tiết {session.start_period}–{session.end_period} · {periodRange(session.start_period, session.end_period)}
          </span>
          {session.room ? <span className="inline-flex items-center gap-1.5"><MapPin className="size-4 text-muted-foreground" strokeWidth={1.75} aria-hidden />{session.room}</span> : null}
          {session.lecturer_name ? <span className="inline-flex items-center gap-1.5"><UserRound className="size-4 text-muted-foreground" strokeWidth={1.75} aria-hidden />{session.lecturer_name}</span> : null}
          <SessionModeBadge mode={session.mode} />
          <SessionStateBadge session={session} />
        </div>
      </div>
      <nav aria-label="Chuyển buổi" className="flex items-center gap-1.5">
        <Button variant="secondary" size="sm" disabled={!prev} onClick={() => prev && onNavigate(prev)}>
          <ChevronLeft aria-hidden /> Buổi trước
        </Button>
        <Button variant="secondary" size="sm" disabled={!next} onClick={() => next && onNavigate(next)}>
          Buổi sau <ChevronRight aria-hidden />
        </Button>
      </nav>
    </div>
  );
}
