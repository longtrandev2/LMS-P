import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Inbox, SearchX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/state-blocks";
import { languageLabel } from "@/lib/languages";
import { SubmissionStatusBadge } from "@/features/assignments/submission/submission-status";
import { formatPoints, shortDateTime } from "./labels";
import { ALL, EMPTY_FILTERS, SubmissionFilters } from "./submission-filters";
import type { AssignmentQuestion, AssignmentSubmission } from "@/types/api";

/** Danh sách lượt nộp: lọc theo câu/trạng thái/verdict/tìm kiếm; bấm hàng mở `/submissions/:id`. */
export function ResultsSubmissionsTab({ query, questions, positionOf }: {
  query: { data?: AssignmentSubmission[]; isPending: boolean; isError: boolean; error: unknown; refetch: () => unknown };
  questions: AssignmentQuestion[]; positionOf: Map<number, number>;
}) {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  // Bài thi bốc ngẫu nhiên: số thứ tự là trong danh sách gộp mọi mã đề, nên kèm trích nội dung câu để dễ nhận ra.
  const snippetOf = new Map(questions.map((q) => [q.question_id, q.content.replace(/[`*_#>[\]()]/g, "").replace(/\s+/g, " ").trim().slice(0, 80)]));
  const rows = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    return (query.data ?? []).filter((row) =>
      (filters.question === ALL || String(row.question_id) === filters.question)
      && (filters.status === ALL || row.status === filters.status)
      && (filters.verdict === ALL || row.verdict === filters.verdict)
      && (!term || `${row.student_full_name ?? ""} ${row.student_code ?? ""}`.toLowerCase().includes(term)),
    ).sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
  }, [query.data, filters]);
  const filtered = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);

  return <section aria-label="Danh sách bài nộp">
    <SubmissionFilters value={filters} onChange={setFilters} questions={questions} />
    <div className="[&_tr>*:first-child]:pl-2 [&_tr>*:last-child]:pr-2">
      {query.isPending ? <TableSkeleton rows={6} cols={6} /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}
      {query.data && rows.length === 0 ? <EmptyState compact icon={filtered ? SearchX : Inbox} title={filtered ? "Không có bài nộp phù hợp bộ lọc" : "Chưa có bài nộp"}
        description={filtered ? "Thử bỏ bớt bộ lọc." : "Bài nộp của sinh viên sẽ hiện ở đây."} /> : null}
      {rows.length ? <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-48">Sinh viên</TableHead>
            <TableHead>Câu</TableHead>
            <TableHead className="text-right">Lượt</TableHead>
            <TableHead>Ngôn ngữ</TableHead>
            <TableHead>Kết quả</TableHead>
            <TableHead className="text-right">Điểm</TableHead>
            <TableHead>Thời điểm nộp</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => <TableRow key={row.id} className="cursor-pointer" onClick={() => navigate(`/submissions/${row.id}`)}>
            <TableCell>
              <Link to={`/submissions/${row.id}`} className="rounded-sm font-medium outline-none hover:underline hover:underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring" onClick={(event) => event.stopPropagation()}>
                {row.student_full_name || `Sinh viên #${row.student_id}`}
              </Link>
              <p className="font-mono text-xs text-muted-foreground">{row.student_code ?? `ID ${row.student_id}`}</p>
            </TableCell>
            <TableCell className="max-w-56 text-muted-foreground">
              <span className="tabular-nums">Câu {positionOf.get(row.question_id) ?? `#${row.question_id}`}</span>
              <p className="truncate text-xs" title={snippetOf.get(row.question_id)}>{snippetOf.get(row.question_id)}</p>
            </TableCell>
            <TableCell className="text-right tabular-nums">{row.attempt_no}</TableCell>
            <TableCell className="text-sm">{row.type === "code" ? languageLabel(row.language) : <span className="text-muted-foreground">Khách quan</span>}</TableCell>
            <TableCell><SubmissionStatusBadge status={row.status} verdict={row.verdict} compact /></TableCell>
            <TableCell className="text-right font-medium tabular-nums">{formatPoints(row.score)}</TableCell>
            <TableCell className="text-sm whitespace-nowrap text-muted-foreground tabular-nums">
              {shortDateTime(row.submitted_at)}
              {row.is_late ? <Badge variant="warning" className="ml-2">Muộn</Badge> : null}
            </TableCell>
          </TableRow>)}
        </TableBody>
      </Table> : null}
    </div>
  </section>;
}
