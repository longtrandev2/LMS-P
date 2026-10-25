import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTablePagination } from "@/components/data-table-pagination";
import { SortSelect } from "@/components/sort-select";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/state-blocks";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Course, Paginated } from "@/types/api";

interface Props {
  onCreate: () => void;
  onOpenClass: (course: Course) => void;
  onEdit: (course: Course) => void;
  onDelete: (course: Course) => void;
}

export function AdminCourseSection({ onCreate, onOpenClass, onEdit, onDelete }: Props) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("code");
  useEffect(() => setPage(1), [search]);
  const query = useQuery({
    queryKey: queryKeys.courses.list({ page, limit: 10, q: search.trim() || undefined, sort }),
    queryFn: ({ signal }) => api.get<Paginated<Course>>("/courses", { page, limit: 10, q: search.trim() || undefined, sort }, signal),
    placeholderData: keepPreviousData,
  });

  return <Card>
    <CardHeader className="border-b">
      <CardTitle>Học phần <span className="ml-1 text-sm font-normal text-muted-foreground">{query.data?.total ?? 0}</span></CardTitle>
      <CardDescription>Tạo môn học trước, sau đó mở các lớp học phần theo học kỳ.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã hoặc tên học phần" aria-label="Tìm học phần" className="max-w-sm" />
        <SortSelect value={sort} onChange={(value) => { setSort(value); setPage(1); }} options={[{ value: "code", label: "Theo mã" }, { value: "name", label: "Theo tên" }, { value: "created_at", label: "Theo ngày tạo" }]} />
      </div>
      {query.isPending ? <TableSkeleton cols={4} /> : query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} />
        : query.data?.items.length === 0 ? <EmptyState compact title={search ? "Không tìm thấy học phần" : "Chưa có học phần"}
            description={search ? "Thử mã hoặc tên khác." : "Tạo học phần để bắt đầu mở lớp."}
            action={!search ? <Button onClick={onCreate}><Plus aria-hidden /> Tạo học phần</Button> : undefined} />
        : <Table>
          <TableHeader><TableRow><TableHead>Mã học phần</TableHead><TableHead>Tên học phần</TableHead><TableHead>Mô tả</TableHead><TableHead className="text-right">Thao tác</TableHead></TableRow></TableHeader>
          <TableBody>{query.data?.items.map((course) => <TableRow key={course.id}>
            <TableCell className="font-mono font-medium">{course.code}</TableCell>
            <TableCell className="font-medium">{course.name}</TableCell>
            <TableCell className="max-w-48 truncate text-muted-foreground">{course.description || "—"}</TableCell>
            <TableCell><div className="flex justify-end gap-1">
              <Button size="sm" onClick={() => onOpenClass(course)}><Plus aria-hidden /> Mở lớp & gán GV</Button>
              <Button variant="ghost" size="icon-sm" aria-label={`Sửa học phần ${course.code}`} onClick={() => onEdit(course)}><Pencil aria-hidden /></Button>
              <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" aria-label={`Xóa học phần ${course.code}`} onClick={() => onDelete(course)}><Trash2 aria-hidden /></Button>
            </div></TableCell>
          </TableRow>)}</TableBody>
        </Table>}
    </CardContent>
    {query.data ? <DataTablePagination page={query.data.page} limit={query.data.limit} total={query.data.total} onPageChange={setPage} /> : null}
  </Card>;
}
