import { Link } from "react-router-dom";
import { ChevronRight, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatUtcDateTime } from "@/lib/date-time";
import { cn } from "@/lib/utils";
import { remainingLabel, type Deadline } from "./class-assignments-query";

const CATEGORY_LABEL = { quiz: "Quiz", assignment: "Bài tập", midterm: "Giữa kỳ", final: "Cuối kỳ" } as const;

export interface DeadlineRow extends Deadline {
  href: string;
  /** Mã lớp (mono) — hiện khi danh sách gộp nhiều lớp. */
  classCode?: string;
}

function DueTag({ row }: { row: DeadlineRow }) {
  if (row.state === "upcoming" && row.assignment.available_from) {
    return <span className="text-xs text-muted-foreground">Mở {formatUtcDateTime(row.assignment.available_from)}</span>;
  }
  const { text, urgent } = remainingLabel(row.dueMs);
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium tabular-nums", urgent || row.state === "late" ? "text-warning" : "text-muted-foreground")}>
      {row.state === "late" ? <Badge variant="warning">Nộp muộn</Badge> : <Clock className="size-3.5" aria-hidden />}
      {text}
    </span>
  );
}

/** Danh sách "Sắp đến hạn" — hàng gọn có viền ngăn, sắp theo hạn (DESIGN.md §5). */
export function DeadlineList({ rows }: { rows: DeadlineRow[] }) {
  return (
    <ul className="divide-y">
      {rows.map((row) => (
        <li key={row.assignment.id}>
          <Link
            to={row.href}
            className="group flex items-center gap-3 px-4 py-2.5 transition-colors duration-150 outline-none hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{row.assignment.title}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                {row.classCode ? <span className="font-mono">{row.classCode}</span> : null}
                <span>{CATEGORY_LABEL[row.assignment.category]}</span>
                <span className="tabular-nums">Hạn {formatUtcDateTime(row.state === "late" && row.assignment.late_due_at ? row.assignment.late_due_at : row.assignment.due_at)}</span>
              </p>
            </div>
            <div className="shrink-0"><DueTag row={row} /></div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-foreground" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}
