import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarRange, GraduationCap, UserRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/state-blocks";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import type { ClassSummary, Paginated } from "@/types/api";
import { cn } from "@/lib/utils";
import { DataTablePagination } from "@/components/data-table-pagination";
import { SortSelect } from "@/components/sort-select";
import { ClassSearchField } from "@/features/classes/class-search-field";

/** Vạch màu nhận diện khóa học — xoay theo mã, giúp phân biệt nhanh thẻ lớp */
const COURSE_STRIPES = [
  "bg-gold",
  "bg-primary",
  "bg-success",
  "bg-destructive/70",
] as const;

function stripeFor(code: string): string {
  let hash = 0;
  for (const ch of code) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return COURSE_STRIPES[Math.abs(hash) % COURSE_STRIPES.length];
}

export function MyClassesPage() {
  const { status: guard } = useAuthGuard(["student"]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("code");
  useEffect(() => setPage(1), [search]);
  const query = useQuery({
    queryKey: queryKeys.me.classes({ page, limit: 12, q: search.trim() || undefined, sort }),
    queryFn: ({ signal }) => api.get<Paginated<ClassSummary>>("/me/classes", { page, limit: 12, q: search.trim() || undefined, sort }, signal),
    enabled: guard === "ok",
  });

  if (guard !== "ok") return null;

  const classes = query.data?.items;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lớp của tôi"
        description="Các lớp học phần bạn đang ghi danh trong học kỳ này."
      />
      <div className="flex flex-wrap gap-3"><ClassSearchField value={search} onChange={setSearch} />
        <SortSelect value={sort} onChange={(value) => { setSort(value); setPage(1); }} options={[{ value: "code", label: "Theo mã lớp" }, { value: "name", label: "Theo tên" }, { value: "semester", label: "Theo học kỳ" }]} />
      </div>

      {query.isPending ? (
        <CardGridSkeleton />
      ) : query.isError ? (
        <Card>
          <CardContent className="p-0">
            <ErrorState error={query.error} onRetry={() => query.refetch()} />
          </CardContent>
        </Card>
      ) : classes && classes.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              title="Bạn chưa được ghi danh vào lớp nào"
              description="Liên hệ giảng viên hoặc phòng đào tạo để được xếp vào lớp học phần."
            />
          </CardContent>
        </Card>
      ) : (
        <><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes?.map((clazz) => (
            <Link
              key={clazz.id}
              to={`/me/classes/${clazz.id}`}
              className="block h-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            >
            <Card
              className="group relative h-full overflow-hidden gap-0 py-0 transition-colors duration-200 hover:border-primary/40"
            >
              <span
                aria-hidden
                className={cn("absolute inset-y-0 left-0 w-1.5", stripeFor(clazz.course_code))}
              />
              <CardContent className="space-y-3 p-5 pl-6">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-semibold text-muted-foreground">
                    {clazz.code}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarRange className="size-3.5" aria-hidden />
                    Học kỳ {clazz.semester}
                  </span>
                </div>
                <h3 className="font-heading text-lg font-bold leading-snug">
                  {clazz.name}
                </h3>
                <div className="space-y-1 border-t pt-3 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <GraduationCap className="size-4 shrink-0" aria-hidden />
                    {clazz.course_name}
                    <span className="font-mono text-xs">({clazz.course_code})</span>
                  </p>
                  {clazz.lecturer_name ? (
                    <p className="flex items-center gap-2">
                      <UserRound className="size-4 shrink-0" aria-hidden />
                      GV: {clazz.lecturer_name}
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
            </Link>
          ))}
        </div>{query.data ? <DataTablePagination page={query.data.page} limit={query.data.limit} total={query.data.total} onPageChange={setPage} /> : null}</>
      )}
    </div>
  );
}
