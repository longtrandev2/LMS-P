import { Link } from "react-router-dom";
import { Send } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/state-blocks";
import { VerdictBadge } from "@/components/verdict-badge";
import { formatUtcDateTime } from "@/lib/date-time";
import { LANGUAGES } from "@/lib/languages";
import type { AssignmentSubmission } from "@/types/api";
import { formatScore, isGrading } from "../../submission-result";
import { studentPaths } from "../paths";

function statusCell(row: AssignmentSubmission) {
  if (isGrading(row.status)) return <span className="text-xs text-muted-foreground">{row.status === "pending" ? "Chờ chấm" : "Đang chấm"}</span>;
  if (row.status === "failed") return <span className="text-xs text-muted-foreground" title="Lỗi hạ tầng — lượt này không tính">Lỗi hệ thống</span>;
  return row.verdict ? <VerdictBadge verdict={row.verdict} compact /> : <span className="text-xs text-muted-foreground">—</span>;
}

/** Tab "Bài nộp": các lượt của câu này, mới nhất trước. */
export function SubmissionHistory({ rows, maxScore }: { rows: AssignmentSubmission[]; maxScore: number }) {
  if (rows.length === 0) return <EmptyState compact icon={Send} title="Chưa có bài nộp" description="Các lượt nộp của bạn cho câu này sẽ hiện ở đây." />;
  return <div className="overflow-x-auto rounded-lg border">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Thời điểm</TableHead>
          <TableHead>Ngôn ngữ</TableHead>
          <TableHead>Kết quả</TableHead>
          <TableHead className="text-right">Điểm</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => <TableRow key={row.id}>
          <TableCell className="font-mono text-xs">
            <Link to={studentPaths.submission(row.id)} className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Xem chi tiết lượt ${row.attempt_no}`}>{row.attempt_no}</Link>
          </TableCell>
          <TableCell className="text-xs whitespace-nowrap tabular-nums">
            <Link to={studentPaths.submission(row.id)} className="rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">{formatUtcDateTime(row.submitted_at)}</Link>
            {row.is_late ? <span className="ml-1.5 text-warning">· muộn</span> : null}
          </TableCell>
          <TableCell className="text-xs">{LANGUAGES.find((item) => item.id === row.language)?.short ?? row.language ?? "—"}</TableCell>
          <TableCell>{statusCell(row)}</TableCell>
          <TableCell className="text-right font-mono text-xs tabular-nums">
            {row.score != null ? `${formatScore(row.score)}/${formatScore(maxScore)}` : "—"}
          </TableCell>
        </TableRow>)}
      </TableBody>
    </Table>
  </div>;
}
