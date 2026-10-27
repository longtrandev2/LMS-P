import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { BookOpen, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
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
import type { Course, Paginated } from "@/types/api";

interface Props {
  onCreate: () => void;
  onOpenClass: (course: Course) => void;
  onEdit: (course: Course) => void;
  onDelete: (course: Course) => void;
}

const SORTS = [{ value: "code", label: "Theo mã" }, { value: "name", label: "Theo tên" }, { value: "created_at", label: "Theo ngày tạo" }];

/** Danh sách học phần (pattern Danh sách): toolbar → bảng → phân trang; hành động phụ trong menu `…`. */
export function AdminCourseSection({ onCreate, onOpenClass, onEdit, onDelete }: Props) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("code");
  useEffect(() => setPage(1), [search]);
  const filters = { page, limit: 10, q: search.trim() || undefined, sort };
  const query = useQuery({
    queryKey: queryKeys.courses.list(filters),
    queryFn: ({ signal }) => api.get<Paginated<Course>>("/courses", filters, signal),
    placeholderData: keepPreviousData,
  });

  return (
    <section aria-labelledby="courses-title" className="space-y-3">
      <div>
        <h2 id="courses-title" className="text-base font-semibold">
          Học phần <span className="ml-1 text-sm font-normal text-muted-foreground tabular-nums">{query.data?.total ?? ""}</span>
        </h2>
        <p className="text-sm text-muted-foreground">Tạo môn học trước, sau đó mở các lớp học phần theo học kỳ.</p>
      </div>
      <div className="space-y-3">
        <ListToolbar className={FLUSH_TOOLBAR} search={<SearchField value={search} onChange={setSearch} placeholder="Tìm mã hoặc tên học phần" />}>
          <SortSelect value={sort} onChange={(value) => { setSort(value); setPage(1); }} options={SORTS} />
        </ListToolbar>
        {query.isPending ? <TableSkeleton cols={5} rows={4} /> : query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} />
          : query.data?.items.length === 0 ? <EmptyState compact icon={BookOpen} title={search ? "Không tìm thấy học phần" : "Chưa có học phần"}
              description={search ? "Thử mã hoặc tên khác." : "Tạo học phần để bắt đầu mở lớp."}
              action={!search ? <Button size="sm" onClick={onCreate}><Plus aria-hidden /> Tạo học phần</Button> : undefined} />
          : <Table className={FLUSH_TABLE}>
            <TableHeader><TableRow>
              <TableHead className="w-32">Mã</TableHead><TableHead>Tên học phần</TableHead><TableHead className="w-20 text-right">Tín chỉ</TableHead>
              <TableHead className="hidden md:table-cell">Mô tả</TableHead><TableHead className="w-px"><span className="sr-only">Thao tác</span></TableHead>
            </TableRow></TableHeader>
            <TableBody>{query.data?.items.map((course) => <TableRow key={course.id}>
              <TableCell className="font-mono text-xs font-medium">{course.code}</TableCell>
              <TableCell className="font-medium">{course.name}</TableCell>
              <TableCell className="text-right tabular-nums">{course.credits ?? "—"}</TableCell>
              <TableCell className="hidden max-w-72 truncate text-muted-foreground md:table-cell">{course.description || "—"}</TableCell>
              <TableCell><div className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label={`Thao tác với học phần ${course.code}`}><MoreHorizontal aria-hidden /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onOpenClass(course)}><Plus aria-hidden /> Mở lớp học phần</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(course)}><Pencil aria-hidden /> Sửa học phần</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => onDelete(course)}><Trash2 aria-hidden /> Xóa học phần</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div></TableCell>
            </TableRow>)}</TableBody>
          </Table>}
        {query.data && query.data.total > query.data.limit ? <DataTablePagination page={query.data.page} limit={query.data.limit} total={query.data.total} onPageChange={setPage} className="border-t-0 px-0" /> : null}
      </div>
    </section>
  );
}
