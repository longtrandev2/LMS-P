import { Link } from "react-router-dom";
import { Check, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/state-blocks";
import { ASSIGNMENT_KIND } from "@/features/classes/assignment-kind";
import { remainingLabel } from "@/features/classes/class-assignments-query";
import { cn } from "@/lib/utils";
import type { ClassSummary } from "@/types/api";
import type { ClassProgress, ProgressGroup, ProgressItem } from "./use-class-progress";

const GROUPS: { key: ProgressGroup; label: string }[] = [
  { key: "open", label: "Đang mở" },
  { key: "upcoming", label: "Sắp mở" },
  { key: "closed", label: "Đã đóng" },
];

function Row({ item, href, active }: { item: ProgressItem; href: string; active: boolean }) {
  const kind = ASSIGNMENT_KIND[item.assignment.category];
  const left = item.group === "open" && item.submitted === false ? remainingLabel(item.dueMs) : null;
  const due = left?.urgent ? left : null;
  return (
    <li>
      <Link to={href} aria-current={active ? "page" : undefined}
        className={cn("flex min-h-9 items-center gap-2.5 py-1.5 pr-5 pl-11 text-sm transition-colors duration-150 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
          active && "bg-accent", item.group === "upcoming" && "text-muted-foreground")}>
        <kind.icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-label={kind.label} />
        <span className="min-w-0 truncate">{item.assignment.title}</span>
        {item.submitted ? <Check className="size-4 shrink-0 text-success" aria-label="Đã nộp" /> : null}
        {due ? <span className={cn("ml-auto shrink-0 text-xs text-warning tabular-nums")}>{due.text}</span> : null}
      </Link>
    </li>
  );
}

/** Cột phải trang lớp sinh viên (DESIGN.md §4, kiểu outline khóa học Frappe): % hoàn thành + bài theo nhóm. */
export function ClassProgressAside({ classId, clazz, progress, activeId }: {
  classId: string;
  clazz?: ClassSummary;
  progress: ClassProgress;
  activeId?: number;
}) {
  return (
    <aside aria-label="Tiến độ của bạn trong lớp"
      className="border-t bg-sidebar lg:sticky lg:top-12 lg:h-[calc(100dvh-3rem)] lg:overflow-y-auto lg:border-t-0 lg:border-l">
      <div className="border-b px-5 pt-6 pb-5">
        {clazz ? <p className="text-base leading-snug font-semibold">{clazz.name}</p> : <Skeleton className="h-5 w-48" />}
        {progress.ready ? (
          <>
            <p className="mt-2 text-sm tabular-nums">{progress.total > 0 ? `${progress.percent}% hoàn thành` : "Chưa có bài nào"}</p>
            <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-border" role="progressbar" aria-label="Tiến độ nộp bài"
              aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent}>
              <div className="h-full rounded-full bg-foreground transition-[width] duration-300" style={{ width: `${progress.percent}%` }} />
            </div>
            {progress.total > 0 ? (
              <p className="mt-2 text-xs text-muted-foreground tabular-nums">Đã nộp {progress.done}/{progress.total} bài đã giao</p>
            ) : null}
          </>
        ) : <div className="mt-3 space-y-2.5"><Skeleton className="h-3.5 w-28" /><Skeleton className="h-1 w-full" /></div>}
      </div>
      {progress.list.isError ? <ErrorState error={progress.list.error} onRetry={() => progress.list.refetch()} className="py-8" /> : (
        <div className="py-3">
          {GROUPS.map((group) => {
            const rows = progress.items.filter((item) => item.group === group.key);
            if (rows.length === 0) return null;
            return (
              <details key={group.key} open={group.key !== "closed" || rows.length <= 4} className="group/section">
                <summary className="flex h-9 cursor-pointer list-none items-center gap-2 px-5 text-sm font-semibold outline-none select-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
                  <ChevronRight className="size-4 text-muted-foreground transition-transform duration-150 group-open/section:rotate-90" aria-hidden />
                  {group.label}
                  <span className="font-normal text-muted-foreground tabular-nums">{rows.length}</span>
                </summary>
                <ul className="pb-2">
                  {rows.map((item) => (
                    <Row key={item.assignment.id} item={item} active={item.assignment.id === activeId}
                      href={`/me/classes/${classId}/assignments/${item.assignment.id}`} />
                  ))}
                </ul>
              </details>
            );
          })}
          {progress.list.isPending ? <div className="space-y-3 px-5 py-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-4 w-full" />)}</div> : null}
        </div>
      )}
    </aside>
  );
}
