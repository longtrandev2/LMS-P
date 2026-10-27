import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleCheck, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/data-table-pagination";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/state-blocks";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import { queryKeys } from "@/lib/query-keys";
import type { FailedSubmission, Page } from "@/types/admin";
import { FailedSubmissionsTable } from "./failed-submissions-table";
import { ReasonDialog } from "./reason-dialog";

const PAGE_SIZE = 20;
type Mode = "selected" | "all" | null;

/** Bài chấm lỗi: chọn nhiều → chấm lại (tối đa 500/lần), hoặc chấm lại toàn bộ — admin-spec §4. */
export function FailedSubmissionsTab() {
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [mode, setMode] = useState<Mode>(null);
  const query = useQuery({
    queryKey: queryKeys.admin.failed(page),
    queryFn: ({ signal }) => api.get<Page<FailedSubmission>>("/admin/grading/failed", { page, limit: PAGE_SIZE }, signal),
    placeholderData: keepPreviousData,
  });
  const total = query.data?.total ?? 0;

  const regrade = useMutation({
    mutationFn: (reason: string) => api.post<{ queued: number; skipped: number }>("/admin/grading/regrade",
      mode === "all" ? { all_failed: true, reason } : { submission_ids: [...selected], reason }),
    onSuccess: ({ queued, skipped }) => {
      toast.success(`Đã đưa ${queued} bài vào hàng chấm${skipped ? ` · bỏ qua ${skipped} bài không còn lỗi` : ""}.`);
      setSelected(new Set()); setMode(null);
      void client.invalidateQueries({ queryKey: ["admin", "grading", "failed"] });
    },
    onError: (error) => toast.error(errorText(error)),
  });

  const toggle = (id: number, on: boolean) => setSelected((current) => {
    const next = new Set(current); if (on) next.add(id); else next.delete(id); return next;
  });
  const togglePage = (on: boolean) => setSelected((current) => {
    const next = new Set(current);
    for (const item of query.data?.items ?? []) { if (on) next.add(item.submission_id); else next.delete(item.submission_id); }
    return next;
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto text-sm text-muted-foreground" aria-live="polite">
          {selected.size > 0 ? <>Đã chọn <span className="font-medium text-foreground tabular-nums">{selected.size}</span> bài</>
            : <>Tổng số: <span className="font-medium text-primary tabular-nums">{total}</span> bài lỗi</>}
        </p>
        {selected.size > 0 ? <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Bỏ chọn</Button> : null}
        {total > 0 ? <>
          <Button variant="outline" onClick={() => setMode("all")}>Chấm lại tất cả bài lỗi</Button>
          <Button disabled={selected.size === 0} onClick={() => setMode("selected")}><RotateCcw aria-hidden /> Chấm lại đã chọn</Button>
        </> : null}
      </div>
      {query.isPending ? <TableSkeleton cols={6} rows={5} />
        : query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} />
        : !query.data?.items.length ? (
          <EmptyState icon={CircleCheck} title="Không có bài chấm lỗi"
            description="Bài nộp bị lỗi hệ thống khi chấm (worker/sandbox) sẽ hiện ở đây để chấm lại." />
        ) : (
          <div className="overflow-hidden rounded-xl border">
            <FailedSubmissionsTable items={query.data.items} selected={selected} onToggle={toggle} onTogglePage={togglePage} />
            <DataTablePagination page={page} limit={PAGE_SIZE} total={total} onPageChange={setPage} />
          </div>
        )}
      <ReasonDialog open={mode !== null} onOpenChange={(open) => !open && setMode(null)} pending={regrade.isPending}
        title={mode === "all" ? "Chấm lại tất cả bài lỗi?" : `Chấm lại ${selected.size} bài đã chọn?`}
        description={mode === "all"
          ? `${total} bài đang ở trạng thái lỗi sẽ được đưa về chờ chấm (tối đa 500 bài mỗi lần). Lịch sử chấm cũ được giữ.`
          : "Các bài được đưa về chờ chấm và tạo job mới. Bài không còn lỗi sẽ được bỏ qua."}
        confirmLabel="Chấm lại" onConfirm={(reason) => regrade.mutate(reason)} />
    </div>
  );
}
