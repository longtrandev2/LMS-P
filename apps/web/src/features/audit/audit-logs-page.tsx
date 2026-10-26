import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

function ChangeDetails({ log }: { log: AuditLog }) {
  return (
    <Popover>
      <PopoverTrigger asChild><Button variant="ghost" size="xs">Xem</Button></PopoverTrigger>
      <PopoverContent align="end" className="w-[min(28rem,calc(100vw-2rem))] p-0">
        <p className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">Giá trị trước / sau</p>
        <pre className="max-h-80 overflow-auto p-3 font-mono text-xs whitespace-pre-wrap">
          {JSON.stringify({ old: log.old_value, new: log.new_value }, null, 2)}
        </pre>
      </PopoverContent>
    </Popover>
  );
}

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
  const filtered = Boolean(actor || action || entity || from || to);
  const clear = () => { setActor(""); setAction(""); setEntity(""); setFrom(""); setTo(""); setPage(1); };
  return (
    <div className="space-y-6">
      <PageHeader title="Nhật ký kiểm toán" description="Tra cứu các thay đổi quan trọng trong hệ thống." />
      <section className="overflow-hidden rounded-xl border bg-card">
        <form className="grid gap-2 border-b px-3 py-2.5 sm:grid-cols-3 sm:px-4 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto]" onSubmit={(event) => { event.preventDefault(); setPage(1); }}>
          <Input aria-label="ID người thao tác" placeholder="ID người thao tác" inputMode="numeric" value={actor} onChange={(e) => setActor(e.target.value)} />
          <Input aria-label="Hành động" placeholder="Hành động" value={action} onChange={(e) => setAction(e.target.value)} />
          <Input aria-label="Loại đối tượng" placeholder="Loại đối tượng" value={entity} onChange={(e) => setEntity(e.target.value)} />
          <Input aria-label="Từ thời điểm" type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input aria-label="Đến thời điểm" type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
          <div className="flex gap-2">
            <Button type="submit" variant="outline">Lọc</Button>
            {filtered ? <Button type="button" variant="ghost" onClick={clear}>Xóa lọc</Button> : null}
          </div>
        </form>
        {query.isPending ? <TableSkeleton cols={5} /> : query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> :
          !query.data?.items.length ? <EmptyState icon={History} title={filtered ? "Không có nhật ký phù hợp" : "Chưa có nhật ký"} description={filtered ? "Thử nới bộ lọc." : "Các thay đổi nhạy cảm sẽ xuất hiện ở đây."} /> :
          <Table>
            <TableHeader><TableRow>
              <TableHead>Thời điểm</TableHead><TableHead>Người thao tác</TableHead><TableHead>Hành động</TableHead>
              <TableHead>Đối tượng</TableHead><TableHead className="hidden md:table-cell">IP</TableHead><TableHead className="w-px"><span className="sr-only">Chi tiết</span></TableHead>
            </TableRow></TableHeader>
            <TableBody>{query.data.items.map((log) => <TableRow key={log.id}>
              <TableCell className="text-muted-foreground tabular-nums">{date(log.created_at)}</TableCell>
              <TableCell className="font-mono text-xs">{log.actor_id ?? "Hệ thống"}</TableCell>
              <TableCell className="font-mono text-xs">{log.action}</TableCell>
              <TableCell><span>{log.entity_type}</span> <span className="font-mono text-xs text-muted-foreground">#{log.entity_id}</span></TableCell>
              <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">{log.ip ?? "—"}</TableCell>
              <TableCell className="text-right"><ChangeDetails log={log} /></TableCell>
            </TableRow>)}</TableBody>
          </Table>}
        {query.data && query.data.items.length > 0 ? <DataTablePagination page={page} limit={PAGE_SIZE} total={query.data.total} onPageChange={setPage} /> : null}
      </section>
    </div>
  );
}
