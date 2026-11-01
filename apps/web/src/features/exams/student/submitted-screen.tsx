import { Link } from "react-router-dom";
import { CircleCheck, Clock, FileText, Hash, Loader2, RotateCcw, Send, TimerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AttemptSessionView } from "@/types/exams";
import { formatScore } from "@/features/assignments/submission-result";
import { shortDateTime } from "@/features/assignments/student/labels";
import { FactList, type MetaItem } from "@/features/assignments/student/meta-row";
import { studentPaths } from "@/features/assignments/student/paths";
import { useAssignmentDetails } from "@/features/assignments/student/use-student-data";
import { SUBMIT_REASON_LABEL } from "./exam-labels";
import { scoreVisible } from "./info/session-history";

/**
 * Màn "Đã nộp bài" (exam-spec §8.1): thời điểm nộp, lý do, mã đề; điểm nếu chính sách xem lại cho phép, không thì
 * "Kết quả sẽ được công bố sau"; nút về trang bài/lớp và "Xem lại bài làm" khi được phép.
 * `timedOut`: client gọi nộp khi hết giờ bị từ chối — chờ server thu bài (trang tự tải lại trạng thái).
 */
export function SubmittedScreen({ view, timedOut }: { view: AttemptSessionView; timedOut: boolean }) {
  const session = view.session;
  const details = useAssignmentDetails(session.assignment_id);
  const item = details.data?.assignment;
  const attempt = session.attempt;
  const collecting = session.status !== "submitted";
  const timeout = timedOut || session.submit_reason === "timeout";
  const showScore = attempt != null && scoreVisible(session, item);

  const facts: (MetaItem | null)[] = [
    { icon: Send, text: session.submitted_at ? `Nộp lúc ${shortDateTime(session.submitted_at)}` : "Đang thu bài…" },
    session.submit_reason ? { icon: FileText, text: `Lý do nộp: ${SUBMIT_REASON_LABEL[session.submit_reason]}` } : null,
    session.paper_code ? { icon: Hash, text: <>Mã đề <span className="font-mono">{session.paper_code}</span></> } : null,
    { icon: RotateCcw, text: `Lượt ${session.attempt_no}` },
  ];

  return <div className="min-h-dvh bg-background px-4 py-12 sm:py-20">
    <main className="mx-auto w-full max-w-xl space-y-8">
      <header className="space-y-2">
        <p className="flex items-center gap-2 text-sm font-medium text-success">
          {collecting ? <Loader2 className="size-4 animate-spin text-muted-foreground motion-reduce:animate-none" aria-hidden />
            : <CircleCheck className="size-4" aria-hidden />}
          <span className={collecting ? "text-muted-foreground" : undefined}>{collecting ? "Đang thu bài" : "Đã nộp bài"}</span>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{view.title}</h1>
      </header>
      {timeout ? <p role="status" className="flex items-start gap-2 rounded-lg bg-warning/12 px-4 py-3 text-sm text-warning">
        <TimerOff className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>Hết giờ — bài đã được hệ thống thu.{collecting ? " Đang chờ máy chủ hoàn tất…" : ""}</span>
      </p> : session.submit_reason === "forced" ? <p role="status" className="rounded-lg bg-warning/12 px-4 py-3 text-sm text-warning">
        Giảng viên đã thu bài của bạn.
      </p> : null}
      <FactList items={facts} />
      <section aria-label="Kết quả" className="border-t pt-6">
        {collecting ? <p className="text-sm text-muted-foreground">Kết quả sẽ hiện khi máy chủ thu bài xong.</p>
          : showScore && attempt ? <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-4xl font-semibold tracking-tight tabular-nums">{formatScore(attempt.score)}</span>
            <span className="text-lg text-muted-foreground tabular-nums">/{formatScore(attempt.max_score ?? view.total_points)} điểm</span>
          </p>
          : <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>Kết quả sẽ được công bố sau{attempt?.review_available_at ? ` — dự kiến từ ${shortDateTime(attempt.review_available_at)}` : ""}.</p>
          </div>}
        {showScore && view.category !== "quiz" ? <p className="mt-2 text-xs text-muted-foreground">Câu lập trình được chấm sau khi nộp — điểm có thể tăng khi chấm xong.</p> : null}
      </section>
      <div className="flex flex-wrap gap-2">
        {attempt?.review_available && item ? <Button asChild variant="cta">
          <Link to={studentPaths.review(item.class_id, item.id, attempt.attempt_id)}>Xem lại bài làm</Link>
        </Button> : null}
        {item ? <Button asChild variant="secondary"><Link to={studentPaths.overview(item.class_id, item.id)}>Về trang bài</Link></Button> : null}
        {item ? <Button asChild variant="secondary"><Link to={studentPaths.classTabFor(item.class_id, item.category)}>Về lớp học</Link></Button>
          : <Button asChild variant="secondary"><Link to="/me/classes">Về lớp học</Link></Button>}
      </div>
    </main>
  </div>;
}
