import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { SUBMIT_REASON_LABEL } from "@/features/exams/monitor/monitor-labels";
import { formatPoints, shortDateTime } from "../labels";
import type { AttemptReview, StudentResultRow } from "@/types/api";
import type { SubmitReason } from "@/types/exams";

type Attempt = NonNullable<StudentResultRow["attempts"]>[number];

const LINK = "flex items-center gap-3 rounded-md bg-background px-3 py-1.5 text-sm shadow-xs transition-colors duration-150 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Thẻ một lượt trong hàng mở rộng. Bài giao theo phiên: `results` không có mã đề/lý do nộp nên đọc từ
 * `GET /quiz-attempts/{id}` khi hàng được mở — cùng query key với trang xem lại, bấm vào mở ngay từ cache.
 */
export function AttemptLink({ assignmentId, attempt, href, session }: {
  assignmentId: number; attempt: Attempt; href: string; session: boolean;
}) {
  const review = useQuery({
    queryKey: queryKeys.assignments.attemptReview(assignmentId, attempt.attempt_id),
    queryFn: ({ signal }) => api.get<AttemptReview>(`/assignments/${assignmentId}/quiz-attempts/${attempt.attempt_id}`, undefined, signal),
    enabled: session,
    staleTime: 60_000,
  });
  const info = review.data?.attempt;
  return <Link to={href} className={LINK}>
    <span className="font-medium">Lượt {attempt.attempt_no}</span>
    {session ? <SessionMeta loading={review.isPending} paperCode={info?.paper_code} reason={info?.submit_reason} /> : null}
    <span className="tabular-nums">{formatPoints(attempt.score)} điểm</span>
    <span className="text-xs text-muted-foreground tabular-nums">{shortDateTime(attempt.submitted_at)}{attempt.is_late ? <span className="text-warning"> · muộn</span> : null}</span>
    <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden />
  </Link>;
}

function SessionMeta({ loading, paperCode, reason }: {
  loading: boolean; paperCode?: string | null; reason?: SubmitReason | null;
}) {
  if (loading) return <Skeleton className="h-4 w-24" />;
  return <>
    {paperCode ? <span className="text-muted-foreground">Mã đề <span className="font-mono text-foreground">{paperCode}</span></span> : null}
    {reason ? <span className={reason === "forced" ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>{SUBMIT_REASON_LABEL[reason]}</span> : null}
  </>;
}
