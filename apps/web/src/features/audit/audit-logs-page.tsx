import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTablePagination } from "@/components/data-table-pagination";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/state-blocks";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Paginated } from "@/types/api";
import { AuditExportButton } from "./audit-export-button";
import { AuditFilters, type AuditFilterValues } from "./audit-filters";
import { AuditLogList } from "./audit-log-list";
import type { AuditLog } from "./types";

const PAGE_SIZE = 20;
const EMPTY: AuditFilterValues = { actor: "", action: "", entity: "", from: "", to: "" };

export function AuditLogsPage() {
  const { status } = useAuthGuard(["admin"]);
  const [page, setPage] = useState(1);
  const [values, setValues] = useState<AuditFilterValues>(EMPTY);
  const criteria = {
    actor_id: values.actor || undefined, action: values.action || undefined,
    entity_type: values.entity || undefined, from: values.from || undefined, to: values.to || undefined,
  };
  const filters = { page, limit: PAGE_SIZE, ...criteria };
  const query = useQuery({
    queryKey: queryKeys.audit.list(filters),
    queryFn: ({ signal }) => api.get<Paginated<AuditLog>>("/admin/audit-logs", filters, signal),
    placeholderData: keepPreviousData,
    enabled: status === "ok",
  });
  if (status !== "ok") return null;
  const filtered = Boolean(values.actor || values.action || values.entity || values.from || values.to);
  const data = query.data;

  return (
    <div className="space-y-6">
      <PageHeader title="Nhật ký kiểm toán" description="Các thao tác nhạy cảm trong hệ thống, mới nhất ở trên cùng."
        actions={<AuditExportButton filters={criteria} />} />
      <div className="space-y-1">
        <AuditFilters
          value={values}
          onChange={(patch) => { setValues((current) => ({ ...current, ...patch })); setPage(1); }}
          onClear={() => { setValues(EMPTY); setPage(1); }}
          fetching={query.isFetching && !query.isPending}
        />
        <div className="-mx-4">
          {query.isPending ? (
            <ListSkeleton rows={8} />
          ) : query.isError ? (
            <ErrorState error={query.error} onRetry={() => query.refetch()} />
          ) : !data?.items.length ? (
            <EmptyState
              icon={History}
              title={filtered ? "Không có nhật ký phù hợp" : "Chưa có nhật ký"}
              description={filtered ? "Thử nới bộ lọc." : "Các thay đổi nhạy cảm sẽ xuất hiện ở đây."}
            />
          ) : (
            <>
              <AuditLogList logs={data.items} />
              <DataTablePagination className="border-t-0" page={page} limit={PAGE_SIZE} total={data.total} onPageChange={setPage} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
