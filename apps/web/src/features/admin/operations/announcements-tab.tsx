import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Megaphone } from "lucide-react";
import { DataTablePagination } from "@/components/data-table-pagination";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/state-blocks";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { formatUtcDateTime } from "@/lib/date-time";
import { queryKeys } from "@/lib/query-keys";
import type { AnnouncementView, Page } from "@/types/admin";
import { AnnouncementForm } from "./announcement-form";
import { audienceText } from "./operations-labels";

const PAGE_SIZE = 10;

/** Thông báo hệ thống: form gửi + lịch sử đã gửi — admin-spec §5.1. */
export function AnnouncementsTab() {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: queryKeys.admin.announcements(page),
    queryFn: ({ signal }) => api.get<Page<AnnouncementView>>("/admin/announcements", { page, limit: PAGE_SIZE }, signal),
    placeholderData: keepPreviousData,
  });
  const data = query.data;

  return (
    <div className="space-y-10">
      <AnnouncementForm />
      <section aria-labelledby="ann-history" className="space-y-3">
        <h2 id="ann-history" className="text-base font-semibold">
          Đã gửi <span className="ml-1 text-sm font-normal text-muted-foreground tabular-nums">{data?.total ?? ""}</span>
        </h2>
        {query.isPending ? <TableSkeleton cols={5} rows={3} />
          : query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} />
          : !data?.items.length ? <EmptyState compact icon={Megaphone} title="Chưa gửi thông báo nào" description="Thông báo đã gửi sẽ hiện ở đây kèm số người nhận." />
          : (
            <div className="overflow-hidden rounded-xl border">
              <Table>
                <TableHeader className="bg-secondary/60">
                  <TableRow>
                    <TableHead className="hidden sm:table-cell">Thời gian</TableHead>
                    <TableHead>Tiêu đề</TableHead>
                    <TableHead>Đối tượng</TableHead>
                    <TableHead className="text-right">Người nhận</TableHead>
                    <TableHead className="hidden md:table-cell">Người gửi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="hidden whitespace-nowrap text-muted-foreground tabular-nums sm:table-cell">{formatUtcDateTime(a.created_at)}</TableCell>
                      <TableCell className="max-w-72"><p className="truncate font-medium" title={a.title}>{a.title}</p></TableCell>
                      <TableCell className="whitespace-nowrap">{audienceText(a.audience, a.role, a.class_code)}</TableCell>
                      <TableCell className="text-right tabular-nums">{a.recipient_count.toLocaleString("vi-VN")}</TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">{a.created_by.full_name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <DataTablePagination page={data.page} limit={data.limit} total={data.total} onPageChange={setPage} />
            </div>
          )}
      </section>
    </div>
  );
}
