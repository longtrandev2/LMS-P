import { Link } from "react-router-dom";
import { ChevronRight, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/state-blocks";
import type { AssignmentSummary } from "@/types/api";
import type { AttemptSessionSummary } from "@/types/exams";
import { formatScore } from "@/features/assignments/submission-result";
import { shortDateTime } from "@/features/assignments/student/labels";
import { studentPaths } from "@/features/assignments/student/paths";
import { SUBMIT_REASON_LABEL } from "../exam-labels";

const ROW = "flex min-h-14 flex-wrap items-center gap-x-5 gap-y-1 border-b px-2 py-3 text-sm";
const LINK = "rounded-sm outline-none transition-colors duration-150 hover:bg-secondary/60 focus-visible:ring-2 focus-visible:ring-ring";

/** Điểm hiện khi được xem lại (hoặc bài chỉ cho xem tổng điểm); không thì "Kết quả công bố sau". */
export function scoreVisible(session: AttemptSessionSummary, item: AssignmentSummary | undefined): boolean {
  return Boolean(session.attempt?.review_available) || item?.review_mode === "never";
}

function SessionRow({ session, item }: { session: AttemptSessionSummary; item: AssignmentSummary }) {
  const attempt = session.attempt;
  const head = <>
    <span className="w-16 font-medium">Lượt {session.attempt_no}</span>
    {session.paper_code ? <span className="text-muted-foreground">Mã đề <span className="font-mono text-foreground">{session.paper_code}</span></span> : null}
  </>;
  if (session.status === "in_progress") {
    return <li>
      <Link to={`/attempt-sessions/${session.id}`} className={`${ROW} ${LINK}`}>
        {head}
        <Badge variant="warning">Đang làm</Badge>
        <span className="text-muted-foreground tabular-nums">Kết thúc lúc {shortDateTime(session.ends_at)}</span>
        <span className="ml-auto inline-flex items-center gap-1 font-medium">Tiếp tục<ChevronRight className="size-4 text-muted-foreground" aria-hidden /></span>
      </Link>
    </li>;
  }
  const max = attempt?.max_score ?? item.total_points;
  const content = <>
    {head}
    <span className="text-muted-foreground tabular-nums">Nộp lúc {shortDateTime(session.submitted_at)}</span>
    {session.submit_reason ? <span className={session.submit_reason === "manual" ? "text-muted-foreground" : "text-warning"}>
      {SUBMIT_REASON_LABEL[session.submit_reason]}
    </span> : null}
    {attempt && scoreVisible(session, item)
      ? <span className="font-semibold tabular-nums">{formatScore(attempt.score)}<span className="font-normal text-muted-foreground">/{formatScore(max)}</span></span>
      : <span className="text-muted-foreground">Kết quả công bố sau</span>}
  </>;
  if (!attempt?.review_available) {
    return <li className={ROW}>
      {content}
      {attempt?.review_available_at ? <span className="ml-auto text-xs text-muted-foreground">Xem lại từ {shortDateTime(attempt.review_available_at)}</span> : null}
    </li>;
  }
  return <li>
    <Link to={studentPaths.review(item.class_id, item.id, attempt.attempt_id)} className={`${ROW} ${LINK}`}>
      {content}
      <span className="ml-auto inline-flex items-center gap-1 font-medium">Xem lại<ChevronRight className="size-4 text-muted-foreground" aria-hidden /></span>
    </Link>
  </li>;
}

/** Lịch sử phiên/lượt: lượt · mã đề · nộp lúc · lý do nộp · điểm hoặc "Kết quả công bố sau" · Xem lại. */
export function SessionHistory({ item, sessions, isPending, error, onRetry }: {
  item: AssignmentSummary; sessions: AttemptSessionSummary[]; isPending: boolean; error: unknown; onRetry: () => void;
}) {
  return <section aria-labelledby="session-history-title">
    <div className="flex items-baseline gap-2 border-b pb-3">
      <h2 id="session-history-title" className="text-base font-semibold">Lịch sử làm bài</h2>
      {sessions.length ? <span className="text-sm text-muted-foreground tabular-nums">{sessions.length}</span> : null}
    </div>
    {isPending ? <div aria-busy="true" aria-label="Đang tải" className="space-y-3 py-4"><Skeleton className="h-6" /><Skeleton className="h-6" /></div>
      : error ? <ErrorState error={error} onRetry={onRetry} />
      : sessions.length === 0 ? <EmptyState compact icon={History} title="Chưa có lượt nào" description="Các lượt làm bài và kết quả sẽ hiện ở đây." />
      : <ul>{sessions.map((session) => <SessionRow key={session.id} session={session} item={item} />)}</ul>}
  </section>;
}
