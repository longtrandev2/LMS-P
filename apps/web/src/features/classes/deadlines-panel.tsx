import { CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ListSkeleton } from "@/components/state-blocks";
import { DeadlineList, type DeadlineRow } from "./deadline-list";

/** Khối "Sắp đến hạn" trên trang chủ theo vai trò (DESIGN.md §5). */
export function DeadlinesPanel({ title = "Sắp đến hạn", rows, loading, failed, onRetry, emptyText, limit = 8 }: {
  title?: string;
  rows: DeadlineRow[];
  loading: boolean;
  failed: number;
  onRetry: () => void;
  emptyText: string;
  limit?: number;
}) {
  return (
    <section aria-labelledby="deadlines-title" className="overflow-hidden rounded-xl border bg-card">
      <header className="flex h-11 items-center justify-between gap-3 border-b px-4">
        <h2 id="deadlines-title" className="text-sm font-semibold">{title}</h2>
        {rows.length > 0 ? <span className="text-xs text-muted-foreground tabular-nums">{rows.length} bài</span> : null}
      </header>
      {loading && rows.length === 0 ? <ListSkeleton rows={3} />
        : rows.length === 0 && failed === 0 ? <EmptyState compact icon={CalendarCheck} title="Không có bài nào sắp đến hạn" description={emptyText} />
        : <DeadlineList rows={rows.slice(0, limit)} />}
      {failed > 0 ? (
        <div role="alert" className="flex items-center justify-between gap-3 border-t px-4 py-2 text-xs text-muted-foreground">
          <span>Không tải được bài của {failed} lớp.</span>
          <Button variant="ghost" size="xs" onClick={onRetry}>Thử lại</Button>
        </div>
      ) : null}
    </section>
  );
}
