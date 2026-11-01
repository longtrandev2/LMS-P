import { Link } from "react-router-dom";
import { ChevronRight, Send } from "lucide-react";
import { EmptyState } from "@/components/state-blocks";
import { VerdictBadge } from "@/components/verdict-badge";
import { LANGUAGES } from "@/lib/languages";
import type { AssignmentSubmission } from "@/types/api";
import { formatScore, isGrading } from "../../submission-result";
import { shortDateTime } from "../labels";
import { studentPaths } from "../paths";

function status(row: AssignmentSubmission) {
  if (isGrading(row.status)) return <span className="text-xs text-muted-foreground">{row.status === "pending" ? "Chờ chấm" : "Đang chấm"}</span>;
  if (row.status === "failed") return <span className="text-xs text-muted-foreground" title="Lỗi hạ tầng — lượt này không tính">Lỗi hệ thống</span>;
  return row.verdict ? <VerdictBadge verdict={row.verdict} compact /> : <span className="text-xs text-muted-foreground">—</span>;
}

/** Tab "Bài nộp": các lượt của câu này dạng hàng (lượt · kết quả · điểm · ngôn ngữ · thời điểm), mới nhất trước. */
export function SubmissionHistory({ rows, maxScore }: { rows: AssignmentSubmission[]; maxScore: number }) {
  if (rows.length === 0) return <EmptyState compact icon={Send} title="Chưa có bài nộp" description="Các lượt nộp của bạn cho câu này sẽ hiện ở đây." />;
  return <ul>
    {rows.map((row) => <li key={row.id} className="border-b last:border-b-0">
      <Link to={studentPaths.submission(row.id)} aria-label={`Xem chi tiết lượt ${row.attempt_no}`}
        className="flex h-12 items-center gap-4 rounded-sm text-sm outline-none transition-colors duration-150 hover:bg-secondary/60 focus-visible:ring-2 focus-visible:ring-ring">
        <span className="w-14 font-medium tabular-nums">Lượt {row.attempt_no}</span>
        <span className="w-12">{status(row)}</span>
        <span className="w-20 font-semibold tabular-nums">
          {row.score != null ? <>{formatScore(row.score)}<span className="font-normal text-muted-foreground">/{formatScore(maxScore)}</span></> : <span className="font-normal text-muted-foreground">—</span>}
        </span>
        <span className="hidden text-muted-foreground sm:inline">{LANGUAGES.find((item) => item.id === row.language)?.short ?? row.language ?? "—"}</span>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {row.is_late ? <span className="mr-1.5 text-warning">Muộn ·</span> : null}{shortDateTime(row.submitted_at)}
        </span>
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
      </Link>
    </li>)}
  </ul>;
}
