import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { School } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTablePagination } from "@/components/data-table-pagination";
import { SortSelect } from "@/components/sort-select";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/state-blocks";
import { ClassSearchField } from "@/features/classes/class-search-field";
import { ClassCard } from "@/features/classes/class-card";
import { DeadlinesPanel } from "@/features/classes/deadlines-panel";
import { useClassesDeadlines } from "@/features/classes/use-classes-deadlines";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import type { ClassSummary, Paginated } from "@/types/api";
import { useMyClasses } from "./use-my-classes";

const SORTS = [{ value: "code", label: "Theo mã lớp" }, { value: "name", label: "Theo tên" }, { value: "semester", label: "Theo học kỳ" }];

/** Trang chủ sinh viên: "Sắp đến hạn" gộp mọi lớp + lưới thẻ lớp đang học. */
export function MyClassesPage() {
  const { status: guard } = useAuthGuard(["student"]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("code");
  useEffect(() => setPage(1), [search]);

  const allClasses = useMyClasses(guard === "ok");
  const deadlines = useClassesDeadlines(allClasses.data ?? [], (clazz, item) => `/me/classes/${clazz.id}/assignments/${item.id}`);
  const filters = { page, limit: 12, q: search.trim() || undefined, sort };
  const query = useQuery({
    queryKey: queryKeys.me.classes(filters),
    queryFn: ({ signal }) => api.get<Paginated<ClassSummary>>("/me/classes", filters, signal),
    placeholderData: keepPreviousData,
    enabled: guard === "ok",
  });

  if (guard !== "ok") return null;
  const classes = query.data?.items;

  return (
    <div className="space-y-10">
      <PageHeader title="Lớp của tôi" description="Bài sắp đến hạn và các lớp học phần bạn đang học." />

      <DeadlinesPanel
        rows={deadlines.rows}
        loading={allClasses.isPending || deadlines.isPending}
        failed={deadlines.failed}
        onRetry={deadlines.refetchFailed}
        emptyText="Bài tập và quiz đang mở của các lớp sẽ hiện ở đây, sắp theo hạn nộp."
      />

      <section aria-labelledby="my-classes-title" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="my-classes-title" className="text-base font-semibold">Các lớp đang học {query.data ? <span className="ml-1 text-sm font-normal text-muted-foreground tabular-nums">{query.data.total}</span> : null}</h2>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <div className="w-full sm:w-64"><ClassSearchField value={search} onChange={setSearch} /></div>
            <SortSelect value={sort} onChange={(value) => { setSort(value); setPage(1); }} options={SORTS} />
          </div>
        </div>
        {query.isPending ? <CardGridSkeleton count={3} />
          : query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} />
          : classes && classes.length === 0 ? (
              <EmptyState icon={School}
                title={search ? "Không tìm thấy lớp" : "Bạn chưa được ghi danh vào lớp nào"}
                description={search ? "Thử mã lớp, tên lớp hoặc học kỳ khác." : "Liên hệ giảng viên hoặc phòng đào tạo để được xếp vào lớp học phần."} />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {classes?.map((clazz) => (
                  <ClassCard key={clazz.id} clazz={clazz} href={`/me/classes/${clazz.id}`}
                    openCount={deadlines.openCount.get(clazz.id)}
                    meta={clazz.lecturer_name ? `GV ${clazz.lecturer_name}` : null} />
                ))}
              </div>
              {query.data && query.data.total > query.data.limit ? (
                <div>
                  <DataTablePagination page={query.data.page} limit={query.data.limit} total={query.data.total} onPageChange={setPage} className="px-0" />
                </div>
              ) : null}
            </>
          )}
      </section>
    </div>
  );
}
