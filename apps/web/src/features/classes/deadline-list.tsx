import { Link } from "react-router-dom";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ASSIGNMENT_KIND, shortDateTime } from "./assignment-kind";
import { remainingLabel, type Deadline } from "./class-assignments-query";

export interface DeadlineRow extends Deadline {
  href: string;
  /** Mã lớp (mono) — hiện khi danh sách gộp nhiều lớp. */
  classCode?: string;
  /** Sinh viên đã nộp bài này. */
  submitted?: boolean;
}

function DueTag({ row }: { row: DeadlineRow }) {
  if (row.submitted) {
    return <span className="inline-flex items-center gap-1 font-medium text-success"><Check className="size-3.5" aria-hidden />Đã nộp</span>;
  }
  if (row.state === "upcoming" && row.assignment.available_from) {
    return <span className="text-muted-foreground">Mở {shortDateTime(row.assignment.available_from)}</span>;
  }
  const { text, urgent } = remainingLabel(row.dueMs);
  return (
    <span className={cn("font-medium", urgent || row.state === "late" ? "text-warning" : "text-foreground/80")}>
      {row.state === "late" ? `Nộp muộn · ${text}` : text}
    </span>
  );
}

/** Danh sách "Sắp đến hạn" (DESIGN.md §4 Trang chủ): loại · tên · lớp · "còn x ngày" — hàng ngăn viền, không khung. */
export function DeadlineList({ rows }: { rows: DeadlineRow[] }) {
  return (
    <ul className="border-t">
      {rows.map((row) => {
        const kind = ASSIGNMENT_KIND[row.assignment.category];
        const due = row.state === "late" && row.assignment.late_due_at ? row.assignment.late_due_at : row.assignment.due_at;
        return (
          <li key={row.assignment.id} className="border-b">
            <Link
              to={row.href}
              className="group -mx-2 flex min-h-14 items-center gap-3 rounded-md px-2 py-2 transition-colors duration-150 outline-none hover:bg-secondary/60 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <kind.icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-label={kind.label} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{row.assignment.title}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                  <span>{kind.label}</span>
                  {row.classCode ? <><span aria-hidden>·</span><span className="font-mono">{row.classCode}</span></> : null}
                  <span aria-hidden className="hidden sm:inline">·</span>
                  <span className="hidden tabular-nums sm:inline">Hạn {shortDateTime(due)}</span>
                </p>
              </div>
              <span className="shrink-0 text-right text-xs tabular-nums"><DueTag row={row} /></span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-foreground" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
