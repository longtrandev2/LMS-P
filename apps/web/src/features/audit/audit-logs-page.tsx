import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { DataTablePagination } from "@/components/data-table-pagination";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/state-blocks";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Paginated } from "@/types/api";
import type { AuditLog } from "./types";

const PAGE_SIZE = 20;
const date = (value: string) => new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));

export function AuditLogsPage() {
  const { status } = useAuthGuard(["admin"]);
  const [page, setPage] = useState(1);
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const filters = { page, limit: PAGE_SIZE, actor_id: actor || undefined, action: action || undefined,
    entity_type: entity || undefined, from: from || undefined, to: to || undefined };
  const query = useQuery({
    queryKey: queryKeys.audit.list(filters),
    queryFn: ({ signal }) => api.get<Paginated<AuditLog>>("/admin/audit-logs", filters, signal),
    placeholderData: keepPreviousData,
    enabled: status === "ok",
  });
  if (status !== "ok") return null;
  const clear = () => { setActor(""); setAction(""); setEntity(""); setFrom(""); setTo(""); setPage(1); };
  return (
    <div className="space-y-6">
      <PageHeader title="Nhật ký kiểm toán" description="Tra cứu các thay đổi quan trọng trong hệ thống." />
      <Card><CardContent className="space-y-0 p-0">
        <form className="grid gap-3 border-b p-4 sm:grid-cols-2 lg:grid-cols-6" onSubmit={(event) => { event.preventDefault(); setPage(1); }}>
          <Input aria-label="ID người thao tác" placeholder="ID người thao tác" inputMode="numeric" value={actor} onChange={(e) => setActor(e.target.value)} />
          <Input aria-label="Hành động" placeholder="Hành động" value={action} onChange={(e) => setAction(e.target.value)} />
          <Input aria-label="Loại đối tượng" placeholder="Loại đối tượng" value={entity} onChange={(e) => setEntity(e.target.value)} />
          <Input aria-label="Từ thời điểm" type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input aria-label="Đến thời điểm" type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
          <div className="flex gap-2"><Button type="submit">Lọc</Button><Button type="button" variant="outline" onClick={clear}>Xóa lọc</Button></div>
        </form>
        {query.isPending ? <TableSkeleton cols={6} /> : query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> :
          !query.data?.items.length ? <EmptyState title="Chưa có nhật ký phù hợp" description="Các thay đổi nhạy cảm sẽ xuất hiện ở đây." /> :
          <Table><TableHeader><TableRow><TableHead>Thời điểm</TableHead><TableHead>Người thao tác</TableHead><TableHead>Hành động</TableHead><TableHead>Đối tượng</TableHead><TableHead>IP</TableHead><TableHead>Chi tiết</TableHead></TableRow></TableHeader>
            <TableBody>{query.data.items.map((log) => <TableRow key={log.id}>
              <TableCell>{date(log.created_at)}</TableCell><TableCell>{log.actor_id ?? "Hệ thống"}</TableCell>
              <TableCell className="font-mono text-xs">{log.action}</TableCell><TableCell>{log.entity_type} #{log.entity_id}</TableCell>
              <TableCell>{log.ip ?? "—"}</TableCell><TableCell><details><summary className="cursor-pointer text-primary">Xem</summary><pre className="max-w-md overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify({ old: log.old_value, new: log.new_value }, null, 2)}</pre></details></TableCell>
            </TableRow>)}</TableBody>
          </Table>}
        {query.data ? <DataTablePagination page={page} limit={PAGE_SIZE} total={query.data.total} onPageChange={setPage} /> : null}
      </CardContent></Card>
    </div>
  );
}
