import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTablePagination } from "@/components/data-table-pagination";
import { SortSelect } from "@/components/sort-select";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/state-blocks";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { ClassSummary, Paginated } from "@/types/api";

interface Props {
  onAssign: (clazz: ClassSummary) => void;
  onEdit: (clazz: ClassSummary) => void;
  onDelete: (clazz: ClassSummary) => void;
}

export function AdminClassSection({ onAssign, onEdit, onDelete }: Props) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("code");
  useEffect(() => setPage(1), [search]);
  const query = useQuery({
    queryKey: queryKeys.classes.list({ page, limit: 10, q: search.trim() || undefined, sort }),
    queryFn: ({ signal }) => api.get<Paginated<ClassSummary>>("/classes", { page, limit: 10, q: search.trim() || undefined, sort }, signal),
    placeholderData: keepPreviousData,
  });

  return <Card>
    <CardHeader className="border-b">
      <CardTitle>Lớp học phần <span className="ml-1 text-sm font-normal text-muted-foreground">{query.data?.total ?? 0}</span></CardTitle>
      <CardDescription>Theo dõi lớp đã mở, xem giảng viên phụ trách và đổi phân công khi cần.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã, tên lớp hoặc học phần" aria-label="Tìm lớp học phần" className="max-w-sm" />
        <SortSelect value={sort} onChange={(value) => { setSort(value); setPage(1); }} options={[{ value: "code", label: "Theo mã lớp" }, { value: "name", label: "Theo tên lớp" }, { value: "created_at", label: "Theo ngày tạo" }]} />
      </div>
      {query.isPending ? <TableSkeleton cols={6} /> : query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} />
        : query.data?.items.length === 0 ? <EmptyState compact title={search ? "Không tìm thấy lớp" : "Chưa mở lớp học phần"}
            description={search ? "Thử từ khóa khác." : "Chọn “Mở lớp & gán GV” tại một học phần ở phía trên."} />
        : <Table>
          <TableHeader><TableRow><TableHead>Lớp học phần</TableHead><TableHead>Học phần</TableHead><TableHead>Học kỳ</TableHead><TableHead>Giảng viên</TableHead><TableHead>Sĩ số</TableHead><TableHead className="text-right">Thao tác</TableHead></TableRow></TableHeader>
          <TableBody>{query.data?.items.map((clazz) => <TableRow key={clazz.id}>
            <TableCell><Link to={`/classes/${clazz.id}`} className="font-medium hover:text-primary hover:underline">{clazz.name}</Link><span className="block font-mono text-xs text-muted-foreground">{clazz.code}</span></TableCell>
            <TableCell><span className="font-medium">{clazz.course_name}</span><span className="block font-mono text-xs text-muted-foreground">{clazz.course_code}</span></TableCell>
            <TableCell className="font-mono">{clazz.semester}</TableCell>
            <TableCell className="font-medium">{clazz.lecturer_name}</TableCell>
            <TableCell className="tabular-nums">{clazz.enrolled_count ?? 0}{clazz.max_students ? ` / ${clazz.max_students}` : ""}</TableCell>
            <TableCell><div className="flex justify-end gap-1">
              <Button size="sm" variant="outline" onClick={() => onAssign(clazz)}>Đổi GV</Button>
              <Button variant="ghost" size="icon-sm" aria-label={`Sửa lớp ${clazz.code}`} onClick={() => onEdit(clazz)}><Pencil aria-hidden /></Button>
              <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" aria-label={`Xóa lớp ${clazz.code}`} onClick={() => onDelete(clazz)}><Trash2 aria-hidden /></Button>
            </div></TableCell>
          </TableRow>)}</TableBody>
        </Table>}
    </CardContent>
    {query.data ? <DataTablePagination page={query.data.page} limit={query.data.limit} total={query.data.total} onPageChange={setPage} /> : null}
  </Card>;
}
