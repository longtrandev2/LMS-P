import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowUpRight, BookOpen, CalendarDays, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTablePagination } from "@/components/data-table-pagination";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { SortSelect } from "@/components/sort-select";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/state-blocks";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { ClassSummary, Paginated } from "@/types/api";

export function CoursesPage() {
  const { status: guard } = useAuthGuard(["lecturer"]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("code");
  useEffect(() => setPage(1), [search]);
  const query = useQuery({
    queryKey: queryKeys.classes.list({ page, limit: 12, q: search.trim() || undefined, sort }),
    queryFn: ({ signal }) => api.get<Paginated<ClassSummary>>("/classes", { page, limit: 12, q: search.trim() || undefined, sort }, signal),
    placeholderData: keepPreviousData,
    enabled: guard === "ok",
  });
  if (guard !== "ok") return null;

  return <div className="space-y-6">
    <PageHeader title="Lớp được phân công" description="Các lớp học phần bạn phụ trách. Chọn một lớp để quản lý sinh viên, học liệu và bài tập." />
    <div className="flex flex-wrap gap-3">
      <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã lớp hoặc tên học phần" aria-label="Tìm lớp được phân công" className="max-w-md" />
      <SortSelect value={sort} onChange={(value) => { setSort(value); setPage(1); }} options={[{ value: "code", label: "Theo mã lớp" }, { value: "name", label: "Theo tên lớp" }, { value: "created_at", label: "Theo ngày tạo" }]} />
    </div>
    {query.isPending ? <CardGridSkeleton /> : query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} />
      : query.data?.items.length === 0 ? <Card><CardContent><EmptyState title={search ? "Không tìm thấy lớp" : "Bạn chưa được phân công lớp nào"}
          description={search ? "Thử tìm theo mã lớp, học phần hoặc học kỳ." : "Quản trị viên sẽ tạo lớp học phần và phân công bạn phụ trách."} /></CardContent></Card>
      : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {query.data?.items.map((clazz) => <Card key={clazz.id} className="justify-between gap-4 transition-colors hover:border-primary/40">
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-2.5 py-1 font-mono text-xs font-semibold text-primary"><BookOpen className="size-3.5" aria-hidden /> {clazz.course_code}</span>
              <span className="text-xs text-muted-foreground">{clazz.status === "locked" ? "Đã khóa" : "Đang hoạt động"}</span>
            </div>
            <div><p className="text-sm text-muted-foreground">{clazz.course_name}</p><h2 className="mt-1 font-heading text-lg font-semibold">{clazz.name}</h2><p className="mt-1 font-mono text-xs text-muted-foreground">{clazz.code}</p></div>
            <div className="flex items-center gap-4 border-t pt-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" aria-hidden /> {clazz.semester}</span>
              <span className="inline-flex items-center gap-1.5"><Users className="size-4" aria-hidden /> {clazz.enrolled_count ?? 0} sinh viên</span>
            </div>
            <Button asChild className="w-full"><Link to={`/classes/${clazz.id}`}>Vào lớp <ArrowUpRight aria-hidden /></Link></Button>
          </CardContent>
        </Card>)}
      </div>}
    {query.data ? <Card className="py-0"><DataTablePagination page={query.data.page} limit={query.data.limit} total={query.data.total} onPageChange={setPage} /></Card> : null}
  </div>;
}
