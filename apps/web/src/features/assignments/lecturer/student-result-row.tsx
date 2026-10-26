import { Fragment } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatUtcDateTime } from "@/lib/date-time";
import { cn } from "@/lib/utils";
import { SubmissionStatusBadge } from "@/features/assignments/submission/submission-status";
import { formatPoints } from "./labels";
import type { AssignmentQuestion, StudentResultRow as Row } from "@/types/api";

/** Hàng sinh viên × câu; quiz có thể mở rộng xem các lượt và liên kết xem lại từng lượt. */
export function StudentResultRow({ row, questions, quiz, expanded, onToggle, attemptHref }: {
  row: Row; questions: AssignmentQuestion[]; quiz: boolean; expanded: boolean; onToggle: () => void;
  attemptHref: (attemptId: number) => string;
}) {
  const byQuestion = new Map(row.questions.map((q) => [q.question_id, q]));
  const canExpand = quiz && (row.attempts?.length ?? 0) > 0;
  const detailId = `attempts-${row.student_id}`;
  return <Fragment>
    <TableRow data-state={expanded ? "selected" : undefined}>
      <TableCell className="sticky left-0 z-[1] bg-card">
        <div className="flex items-center gap-2">
          {quiz ? <Button type="button" variant="ghost" size="icon-xs" disabled={!canExpand} aria-expanded={expanded} aria-controls={detailId}
            aria-label={expanded ? `Ẩn các lượt của ${row.student_full_name}` : `Xem các lượt của ${row.student_full_name}`} onClick={onToggle}>
            <ChevronRight className={cn("transition-transform", expanded && "rotate-90")} aria-hidden />
          </Button> : null}
          <div className="min-w-0">
            <p className="truncate font-medium">{row.student_full_name}</p>
            <p className="font-mono text-xs text-muted-foreground">{row.student_code ?? `ID ${row.student_id}`}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {row.final_score != null ? <><span className="font-semibold">{formatPoints(row.final_score)}</span><span className="text-muted-foreground"> / {formatPoints(row.max_score)}</span></>
          : <span className="text-muted-foreground">Chưa nộp</span>}
      </TableCell>
      <TableCell className="text-right tabular-nums">{row.attempt_count}</TableCell>
      {questions.map((question) => {
        const cell = byQuestion.get(question.question_id);
        return <TableCell key={question.question_id} className="text-center">
          {!cell || cell.attempt_count === 0 ? <span className="text-muted-foreground">—</span> : <div className="flex flex-col items-center gap-1">
            <span className="tabular-nums">{formatPoints(cell.final_score)}</span>
            {cell.last_verdict || cell.last_status === "pending" || cell.last_status === "grading" || cell.last_status === "failed"
              ? <SubmissionStatusBadge status={cell.last_status} verdict={cell.last_verdict} compact /> : null}
          </div>}
        </TableCell>;
      })}
    </TableRow>
    {expanded && row.attempts?.length ? <TableRow id={detailId} className="bg-muted/30 hover:bg-muted/30">
      <TableCell colSpan={3 + questions.length} className="py-3">
        <ul className="flex flex-wrap gap-2">
          {row.attempts.map((attempt) => <li key={attempt.attempt_id}>
            <Link to={attemptHref(attempt.attempt_id)} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 text-sm transition-colors hover:bg-muted">
              <span className="font-medium">Lượt {attempt.attempt_no}</span>
              <span className="tabular-nums">{formatPoints(attempt.score)} điểm</span>
              <span className="text-xs text-muted-foreground">{formatUtcDateTime(attempt.submitted_at)}{attempt.is_late ? " · muộn" : ""}</span>
              <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden />
            </Link>
          </li>)}
        </ul>
      </TableCell>
    </TableRow> : null}
  </Fragment>;
}
