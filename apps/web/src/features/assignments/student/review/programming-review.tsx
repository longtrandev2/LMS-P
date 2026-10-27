import { Link } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { VerdictBadge } from "@/components/verdict-badge";
import type { ReviewQuestion } from "@/types/api";
import { isGrading } from "../../submission-result";
import { studentPaths } from "../paths";

/** Câu lập trình đang chờ/đang chấm (điểm chưa có) — exam-spec §6. */
export function isReviewPending(row: ReviewQuestion): boolean {
  if (row.question.type !== "programming" || row.submission_id == null) return false;
  return isGrading(row.status) || row.score == null;
}

/** Phần kết quả của câu lập trình trên màn xem lại: verdict hoặc "Đang chấm" + link sang bài nộp. */
export function ProgrammingReview({ row }: { row: ReviewQuestion }) {
  if (row.submission_id == null) return <p className="text-sm text-muted-foreground">Bạn không nộp code cho câu này (0 điểm).</p>;
  const pending = isReviewPending(row);
  return <div className="flex flex-wrap items-center gap-3 rounded-lg bg-secondary px-4 py-3 text-sm">
    {pending ? <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />Đang chấm
    </span> : row.verdict ? <VerdictBadge verdict={row.verdict} /> : <span className="text-muted-foreground">Đã chấm</span>}
    <span className="text-muted-foreground">{pending ? "Điểm sẽ cập nhật khi máy chấm xong." : "Kết quả từng test xem ở trang bài nộp."}</span>
    <Link to={studentPaths.submission(row.submission_id)}
      className="ml-auto inline-flex items-center gap-1 rounded-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
      Xem bài nộp<ArrowRight className="size-3.5" aria-hidden />
    </Link>
  </div>;
}
