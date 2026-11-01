import { Fragment } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { SubmissionStatusBadge } from "@/features/assignments/submission/submission-status";
import { formatPoints } from "./labels";
import { AttemptLink } from "./results/attempt-link";
import type { AssignmentQuestion, StudentResultRow as Row } from "@/types/api";

/**
 * Hàng sinh viên × câu; quiz và bài giao theo phiên mở rộng được để xem các lượt và liên kết xem lại từng lượt.
 * Bài giao theo phiên (`session`) hiện thêm mã đề và lý do nộp của mỗi lượt.
 */
export function StudentResultRow({ row, questions, quiz, session, assignmentId, expanded, onToggle, attemptHref }: {
  row: Row; questions: AssignmentQuestion[]; quiz: boolean; session: boolean; assignmentId: number;
  expanded: boolean; onToggle: () => void; attemptHref: (attemptId: number) => string;
}) {
  const byQuestion = new Map(row.questions.map((q) => [q.question_id, q]));
  const canExpand = quiz && (row.attempts?.length ?? 0) > 0;
  const detailId = `attempts-${row.student_id}`;
  return <Fragment>
    <TableRow data-state={expanded ? "selected" : undefined}>
      <TableCell className={cn("sticky left-0 z-[1]", expanded ? "bg-muted" : "bg-background")}>
        <div className="flex items-center gap-2">
          {quiz ? <Button type="button" variant="ghost" size="icon-xs" disabled={!canExpand} aria-expanded={expanded} aria-controls={detailId}
            aria-label={expanded ? `Ẩn các lượt của ${row.student_full_name}` : `Xem các lượt của ${row.student_full_name}`} onClick={onToggle}>
            <ChevronRight className={cn("transition-transform duration-150 motion-reduce:transition-none", expanded && "rotate-90")} aria-hidden />
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
    {expanded && row.attempts?.length ? <TableRow id={detailId} className="bg-secondary/60 hover:bg-secondary/60">
      <TableCell colSpan={3 + questions.length} className="py-3">
        <ul className="flex flex-wrap gap-2">
          {row.attempts.map((attempt) => <li key={attempt.attempt_id}>
            <AttemptLink assignmentId={assignmentId} attempt={attempt} href={attemptHref(attempt.attempt_id)} session={session} />
          </li>)}
        </ul>
      </TableCell>
    </TableRow> : null}
  </Fragment>;
}
