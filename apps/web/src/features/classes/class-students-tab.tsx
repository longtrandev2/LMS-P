import { useEffect, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ListToolbar } from "@/components/list-toolbar";
import { DataTablePagination } from "@/components/data-table-pagination";
import { SortSelect } from "@/components/sort-select";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/state-blocks";
import { EnrollStudentsDialog } from "@/features/classes/enroll-students-dialog";
import { FLUSH_TABLE, FLUSH_TOOLBAR } from "@/features/classes/list-styles";
import { RemoveStudentButton } from "@/features/classes/remove-student-button";
import { ClassSearchField } from "@/features/classes/class-search-field";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { ClassStudent, Paginated } from "@/types/api";

const PAGE_SIZE = 20;
const SORTS = [
  { value: "full_name", label: "Theo tên" },
  { value: "student_code", label: "Theo mã sinh viên" },
  { value: "enrolled_at", label: "Theo ngày ghi danh" },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts.at(-2)?.[0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase();
}

/** Tab Sinh viên (chỉ giảng viên/quản trị): danh sách ghi danh + thêm/xóa sinh viên. */
export function ClassStudentsTab({ classId }: { classId: string }) {
  const queryClient = useQueryClient();
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("full_name");
  useEffect(() => setPage(1), [search]);

  const filters = { page, limit: PAGE_SIZE, q: search.trim() || undefined, sort };
  const query = useQuery({
    queryKey: queryKeys.classes.students(classId, filters),
    queryFn: ({ signal }) => api.get<Paginated<ClassStudent>>(`/classes/${classId}/students`, filters, signal),
    placeholderData: keepPreviousData,
  });
  const students = query.data?.items;
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.classes.students(classId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.classes.detail(classId) });
  };
  const addButton = <Button size="sm" onClick={() => setEnrollOpen(true)}><UserPlus aria-hidden /> Thêm sinh viên</Button>;

  return (
    <section aria-label="Sinh viên của lớp" className="space-y-3">
      <ListToolbar className={FLUSH_TOOLBAR} search={<ClassSearchField value={search} onChange={setSearch} placeholder="Tìm tên, email, mã SV" />}>
        <SortSelect value={sort} onChange={(value) => { setSort(value); setPage(1); }} options={SORTS} />
        {addButton}
      </ListToolbar>
      {query.isPending ? <TableSkeleton cols={4} />
        : query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} />
        : students && students.length === 0 ? (
          <EmptyState icon={Users}
            title={search ? "Không tìm thấy sinh viên" : "Chưa có sinh viên trong lớp"}
            description={search ? "Thử tên, email hoặc mã sinh viên khác." : "Thêm sinh viên bằng mã sinh viên hoặc email — từng người hoặc hàng loạt."}
            action={search ? undefined : addButton} />
        ) : (
          <Table className={FLUSH_TABLE}>
            <TableHeader>
              <TableRow>
                <TableHead>Sinh viên</TableHead>
                <TableHead>Mã SV</TableHead>
                <TableHead className="hidden sm:table-cell">Ngày ghi danh</TableHead>
                <TableHead className="w-12"><span className="sr-only">Thao tác</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students?.map((student) => (
                <TableRow key={student.user_id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar size="sm"><AvatarFallback className="text-[10px]">{initials(student.full_name)}</AvatarFallback></Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{student.full_name}</p>
                        <p className="truncate text-xs text-muted-foreground">{student.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{student.student_code ?? "—"}</TableCell>
                  <TableCell className="hidden text-muted-foreground tabular-nums sm:table-cell">
                    {new Date(student.enrolled_at).toLocaleDateString("vi-VN")}
                  </TableCell>
                  <TableCell className="text-right">
                    <RemoveStudentButton classId={classId} student={student} onRemoved={invalidate} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      {query.data && query.data.total > query.data.limit ? (
        <DataTablePagination page={query.data.page} limit={query.data.limit} total={query.data.total} onPageChange={setPage} className="border-t-0 px-0" />
      ) : null}
      {enrollOpen ? <EnrollStudentsDialog onOpenChange={setEnrollOpen} classId={classId} onEnrolled={invalidate} /> : null}
    </section>
  );
}
