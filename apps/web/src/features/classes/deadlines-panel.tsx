import { CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ListSkeleton } from "@/components/state-blocks";
import { DeadlineList, type DeadlineRow } from "./deadline-list";
import { SectionHeading } from "./section-heading";

/** Khối "Sắp đến hạn" trên trang chủ theo vai trò — tiêu đề section + danh sách hàng, không khung. */
export function DeadlinesPanel({ title = "Sắp đến hạn", rows, loading, failed, onRetry, emptyText, limit = 6 }: {
  title?: string;
  rows: DeadlineRow[];
  loading: boolean;
  failed: number;
  onRetry: () => void;
  emptyText: string;
  limit?: number;
}) {
  return (
    <section aria-labelledby="deadlines-title" className="space-y-2">
      <SectionHeading id="deadlines-title" title={title} count={rows.length > 0 ? rows.length : undefined} />
      {loading && rows.length === 0 ? <ListSkeleton rows={3} />
        : rows.length === 0 && failed === 0 ? (
          <EmptyState compact icon={CalendarCheck} title="Không có bài nào sắp đến hạn" description={emptyText}
            className="items-start px-0 text-left" />
        ) : <DeadlineList rows={rows.slice(0, limit)} />}
      {rows.length > limit ? (
        <p className="pt-1 text-xs text-muted-foreground tabular-nums">và {rows.length - limit} bài khác — xem trong từng lớp.</p>
      ) : null}
      {failed > 0 ? (
        <div role="alert" className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
          <span>Không tải được bài của {failed} lớp.</span>
          <Button variant="ghost" size="xs" onClick={onRetry}>Thử lại</Button>
        </div>
      ) : null}
    </section>
  );
}
