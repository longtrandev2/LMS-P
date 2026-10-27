import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { MoreHorizontal, Pencil, School, SquareArrowOutUpRight, Trash2, UserCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ListToolbar, SearchField } from "@/components/list-toolbar";
import { DataTablePagination } from "@/components/data-table-pagination";
import { SortSelect } from "@/components/sort-select";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/state-blocks";
import { FLUSH_TABLE, FLUSH_TOOLBAR } from "@/features/classes/list-styles";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { ClassSummary, Paginated } from "@/types/api";

interface Props {
  onAssign: (clazz: ClassSummary) => void;
  onEdit: (clazz: ClassSummary) => void;
  onDelete: (clazz: ClassSummary) => void;
}

const SORTS = [{ value: "code", label: "Theo mã lớp" }, { value: "name", label: "Theo tên lớp" }, { value: "created_at", label: "Theo ngày tạo" }];

/** Danh sách lớp học phần cho quản trị: bảng gọn, hành động trong menu `…`. */
export function AdminClassSection({ onAssign, onEdit, onDelete }: Props) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("code");
  useEffect(() => setPage(1), [search]);
  const filters = { page, limit: 10, q: search.trim() || undefined, sort };
  const query = useQuery({
    queryKey: queryKeys.classes.list(filters),
    queryFn: ({ signal }) => api.get<Paginated<ClassSummary>>("/classes", filters, signal),
    placeholderData: keepPreviousData,
  });

  return (
    <section aria-labelledby="classes-title" className="space-y-3">
      <div>
        <h2 id="classes-title" className="text-base font-semibold">
          Lớp học phần <span className="ml-1 text-sm font-normal text-muted-foreground tabular-nums">{query.data?.total ?? ""}</span>
        </h2>
        <p className="text-sm text-muted-foreground">Lớp đã mở, giảng viên phụ trách và sĩ số.</p>
      </div>
      <div className="space-y-3">
        <ListToolbar className={FLUSH_TOOLBAR} search={<SearchField value={search} onChange={setSearch} placeholder="Tìm mã, tên lớp hoặc học phần" />}>
          <SortSelect value={sort} onChange={(value) => { setSort(value); setPage(1); }} options={SORTS} />
        </ListToolbar>
        {query.isPending ? <TableSkeleton cols={5} rows={4} /> : query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} />
          : query.data?.items.length === 0 ? <EmptyState compact icon={School} title={search ? "Không tìm thấy lớp" : "Chưa mở lớp học phần"}
              description={search ? "Thử từ khóa khác." : "Chọn “Mở lớp” tại một học phần ở phía trên."} />
          : <Table className={FLUSH_TABLE}>
            <TableHeader><TableRow>
              <TableHead>Lớp học phần</TableHead><TableHead className="hidden md:table-cell">Học phần</TableHead>
              <TableHead>Học kỳ</TableHead><TableHead className="hidden sm:table-cell">Giảng viên</TableHead>
              <TableHead className="text-right">Sĩ số</TableHead><TableHead className="w-px"><span className="sr-only">Thao tác</span></TableHead>
            </TableRow></TableHeader>
            <TableBody>{query.data?.items.map((clazz) => <TableRow key={clazz.id}>
              <TableCell>
                <Link to={`/classes/${clazz.id}`} className="font-medium underline-offset-4 hover:underline">{clazz.name}</Link>
                <span className="mt-0.5 flex items-center gap-2 font-mono text-xs text-muted-foreground">{clazz.code}{clazz.status === "locked" ? <Badge variant="destructive">Đã khóa</Badge> : null}</span>
              </TableCell>
              <TableCell className="hidden md:table-cell"><span className="block max-w-56 truncate">{clazz.course_name}</span><span className="block font-mono text-xs text-muted-foreground">{clazz.course_code}</span></TableCell>
              <TableCell className="font-mono text-xs">{clazz.semester}</TableCell>
              <TableCell className="hidden sm:table-cell">{clazz.lecturer_name || "—"}</TableCell>
              <TableCell className="text-right tabular-nums">{clazz.enrolled_count ?? 0}{clazz.max_students ? ` / ${clazz.max_students}` : ""}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label={`Thao tác với lớp ${clazz.code}`}><MoreHorizontal aria-hidden /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/classes/${clazz.id}`)}><SquareArrowOutUpRight aria-hidden /> Mở trang lớp</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onAssign(clazz)}><UserCog aria-hidden /> Đổi giảng viên</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(clazz)}><Pencil aria-hidden /> Sửa lớp</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => onDelete(clazz)}><Trash2 aria-hidden /> Xóa lớp</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>)}</TableBody>
          </Table>}
        {query.data && query.data.total > query.data.limit ? <DataTablePagination page={query.data.page} limit={query.data.limit} total={query.data.total} onPageChange={setPage} className="border-t-0 px-0" /> : null}
      </div>
    </section>
  );
}
