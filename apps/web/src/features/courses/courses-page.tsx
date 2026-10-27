import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { FileQuestion, School } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/data-table-pagination";
import { PageHeader } from "@/components/page-header";
import { SortSelect } from "@/components/sort-select";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/state-blocks";
import { ClassSearchField } from "@/features/classes/class-search-field";
import { ClassCard } from "@/features/classes/class-card";
import { DeadlinesPanel } from "@/features/classes/deadlines-panel";
import { useClassesDeadlines } from "@/features/classes/use-classes-deadlines";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { ClassSummary, Paginated } from "@/types/api";

const SORTS = [{ value: "code", label: "Theo mã lớp" }, { value: "name", label: "Theo tên lớp" }, { value: "created_at", label: "Theo ngày tạo" }];
const EMPTY: ClassSummary[] = [];

/** Trang chủ giảng viên: bài đang mở của các lớp + lưới lớp phụ trách + lối tắt ngân hàng câu hỏi. */
export function CoursesPage() {
  const { status: guard } = useAuthGuard(["lecturer"]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("code");
  useEffect(() => setPage(1), [search]);
  const filters = { page, limit: 12, q: search.trim() || undefined, sort };
  const query = useQuery({
    queryKey: queryKeys.classes.list(filters),
    queryFn: ({ signal }) => api.get<Paginated<ClassSummary>>("/classes", filters, signal),
    placeholderData: keepPreviousData,
    enabled: guard === "ok",
  });
  const classes = query.data?.items ?? EMPTY;
  const deadlines = useClassesDeadlines(classes, (clazz, item) => `/classes/${clazz.id}/assignments/${item.id}/results`);
  if (guard !== "ok") return null;

  return (
    <div className="space-y-10">
      <PageHeader
        title="Lớp phụ trách"
        description="Các lớp học phần bạn được phân công. Chọn lớp để quản lý học liệu, bài tập và sinh viên."
        actions={<Button variant="outline" asChild><Link to="/questions"><FileQuestion aria-hidden /> Ngân hàng câu hỏi</Link></Button>}
      />

      <DeadlinesPanel
        rows={deadlines.rows}
        loading={query.isPending || deadlines.isPending}
        failed={deadlines.failed}
        onRetry={deadlines.refetchFailed}
        emptyText="Bài đã xuất bản và chưa đóng của các lớp trên trang này sẽ hiện ở đây."
      />

      <section aria-labelledby="teaching-title" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="teaching-title" className="text-base font-semibold">
            Lớp học phần {query.data ? <span className="ml-1 text-sm font-normal text-muted-foreground tabular-nums">{query.data.total}</span> : null}
          </h2>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <div className="w-full sm:w-64"><ClassSearchField value={search} onChange={setSearch} placeholder="Tìm mã lớp, học phần" /></div>
            <SortSelect value={sort} onChange={(value) => { setSort(value); setPage(1); }} options={SORTS} />
          </div>
        </div>
        {query.isPending ? <CardGridSkeleton count={3} />
          : query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} />
          : classes.length === 0 ? (
              <EmptyState icon={School}
                title={search ? "Không tìm thấy lớp" : "Bạn chưa được phân công lớp nào"}
                description={search ? "Thử tìm theo mã lớp, học phần hoặc học kỳ." : "Quản trị viên sẽ mở lớp học phần và phân công bạn phụ trách."} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {classes.map((clazz) => (
                <ClassCard key={clazz.id} clazz={clazz} href={`/classes/${clazz.id}`}
                  openCount={deadlines.openCount.get(clazz.id)}
                  meta={<span className="tabular-nums">{clazz.enrolled_count ?? 0} sinh viên{clazz.status === "locked" ? " · Đã khóa" : ""}</span>} />
              ))}
            </div>
          )}
        {query.data && query.data.total > query.data.limit ? (
          <div>
            <DataTablePagination page={query.data.page} limit={query.data.limit} total={query.data.total} onPageChange={setPage} className="px-0" />
          </div>
        ) : null}
      </section>
    </div>
  );
}
