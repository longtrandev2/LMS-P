import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileQuestion, Library, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/data-table-pagination";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/state-blocks";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Course, Paginated, QuestionBank, QuestionCategory, QuestionSummary } from "@/types/api";
import { CategoryCreateDialog } from "./category-create-dialog";
import { QuestionBankHeader } from "./question-bank-header";
import { QuestionBankSidebar } from "./question-bank-sidebar";
import { QuestionDeleteDialog } from "./question-delete-dialog";
import { QuestionListFilters, type QuestionFilterValues } from "./question-list-filters";
import { QuestionListItem } from "./question-list-item";

const PAGE_SIZE = 12;
const toId = (value: string | null) => (value && Number(value) > 0 ? Number(value) : null);

/** Ngân hàng câu hỏi: cột trái chọn ngân hàng (URL `?bank=&category=`), vùng chính đầu trang + bộ lọc + danh sách hàng. */
export function QuestionsPage() {
  const { status: guard, user } = useAuthGuard(["admin", "lecturer"]);
  const canAuthor = !!user?.roles.includes("lecturer");
  const cache = useQueryClient();
  const [params, setParams] = useSearchParams();
  const bankId = toId(params.get("bank"));
  const categoryId = toId(params.get("category"));
  const [courseId, setCourseId] = useState<number | null>(null);
  const [filters, setFilters] = useState<QuestionFilterValues>({ search: "", type: "", difficulty: "" });
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<QuestionSummary | null>(null);
  const [addingCategory, setAddingCategory] = useState(false);
  const [counts, setCounts] = useState<Record<number, number>>({});

  const courses = useQuery({
    queryKey: queryKeys.courses.list({ page: 1, limit: 100 }),
    queryFn: ({ signal }) => api.get<Paginated<Course>>("/courses", { page: 1, limit: 100 }, signal),
    enabled: guard === "ok",
  });
  const banks = useQuery({
    queryKey: queryKeys.questionBanks.list(),
    queryFn: ({ signal }) => api.get<QuestionBank[]>("/question-banks", undefined, signal),
    enabled: guard === "ok",
  });
  const categories = useQuery({
    queryKey: queryKeys.questionBanks.categories(bankId ?? undefined),
    queryFn: ({ signal }) => api.get<QuestionCategory[]>(`/question-banks/${bankId}/categories`, undefined, signal),
    enabled: guard === "ok" && bankId != null,
  });
  const listFilters = { page, limit: PAGE_SIZE, bank_id: bankId ?? undefined, category_id: categoryId ?? undefined, q: filters.search.trim() || undefined, type: filters.type || undefined, difficulty: filters.difficulty || undefined };
  const query = useQuery({
    queryKey: queryKeys.questions.list(listFilters),
    queryFn: ({ signal }) => api.get<Paginated<QuestionSummary>>("/questions", listFilters, signal),
    placeholderData: keepPreviousData,
    enabled: guard === "ok" && bankId != null,
  });
  // Số câu của ngân hàng chỉ biết khi xem danh sách không lọc — nhớ lại để hiện ở cột trái.
  const unfiltered = categoryId == null && !listFilters.q && !listFilters.type && !listFilters.difficulty;
  const knownTotal = bankId != null && unfiltered && query.data && !query.isPlaceholderData ? query.data.total : null;
  useEffect(() => {
    if (bankId != null && knownTotal != null) setCounts((current) => current[bankId] === knownTotal ? current : { ...current, [bankId]: knownTotal });
  }, [bankId, knownTotal]);
  if (guard !== "ok") return null;

  const select = (bank: number | null, category: number | null) => {
    setPage(1);
    setParams(bank == null ? {} : { bank: String(bank), ...(category != null ? { category: String(category) } : {}) }, { replace: true });
  };
  const setFilter = (patch: Partial<QuestionFilterValues>) => { setFilters((current) => ({ ...current, ...patch })); setPage(1); };
  const refreshAll = () => { void cache.invalidateQueries({ queryKey: queryKeys.questionBanks.all }); void cache.invalidateQueries({ queryKey: queryKeys.questions.all }); };
  const activeBank = banks.data?.find((item) => item.id === bankId);
  const canEdit = canAuthor && !!activeBank?.can_edit;
  const items = bankId == null ? [] : query.data?.items ?? [];
  const createHref = bankId != null ? `/questions/new?bank=${bankId}${categoryId != null ? `&category=${categoryId}` : ""}` : "";
  const filtered = !unfiltered;

  if (courses.isError) return <ErrorState error={courses.error} onRetry={() => courses.refetch()} />;
  if (banks.isError) return <ErrorState error={banks.error} onRetry={() => banks.refetch()} />;

  return <div data-layout="wide" className="mx-auto grid max-w-6xl items-start gap-8 lg:grid-cols-[224px_minmax(0,1fr)] lg:gap-10">
    <QuestionBankSidebar courses={courses.data?.items ?? []} banks={banks.data ?? []} courseId={courseId} bankId={bankId} counts={counts}
      canCreate={canAuthor} coursesLoading={courses.isPending} banksLoading={banks.isPending}
      onCourseChange={(id) => { setCourseId(id); if (id != null && activeBank?.course_id !== id) select(null, null); }}
      onBankChange={(id) => select(id, null)}
      onBankCreated={(bank) => {
        cache.setQueryData<QuestionBank[]>(queryKeys.questionBanks.list(), (current) => [...(current ?? []).filter((item) => item.id !== bank.id), bank]);
        refreshAll(); select(bank.id, null);
      }} />
    <div className="min-w-0 space-y-6">
      <QuestionBankHeader bank={activeBank} total={bankId != null ? counts[bankId] ?? null : null} categories={categories.data ?? []}
        categoryId={categoryId} categoriesLoading={bankId != null && categories.isPending} canAuthor={canAuthor} createHref={createHref} onChanged={refreshAll} />
      {bankId == null ? <EmptyState icon={Library} title="Chọn một ngân hàng để xem câu hỏi"
        description="Chọn ngân hàng ở cột bên trái. Lọc theo học phần để tạo ngân hàng mới." /> : <section aria-label="Danh sách câu hỏi" className="space-y-3">
        <QuestionListFilters values={filters} onChange={setFilter} categories={categories.data ?? []} categoryId={categoryId}
          categoriesLoading={categories.isPending} onCategory={(id) => select(bankId, id)} disabled={false}
          onAddCategory={canEdit ? () => setAddingCategory(true) : undefined} />
        {(query.data && filtered) || query.isPlaceholderData ? <p role="status" className="px-1 text-xs text-muted-foreground tabular-nums">
          {query.isPlaceholderData ? "Đang tải…" : `${query.data?.total ?? 0} câu khớp bộ lọc`}</p> : null}
        {query.isError && !query.data ? <ErrorState error={query.error} onRetry={() => query.refetch()} />
          : query.isPending ? <div className="border-t"><ListSkeleton rows={6} /></div>
          : items.length === 0 ? <EmptyState compact icon={FileQuestion} className="border-t"
            title={filtered ? "Không có câu hỏi khớp bộ lọc" : "Ngân hàng chưa có câu hỏi"}
            description={filtered ? "Thử đổi từ khóa, danh mục hoặc bỏ bớt bộ lọc." : "Tạo câu hỏi đầu tiên hoặc nhập nhanh từ file CSV."}
            action={!filtered && canEdit ? <Button asChild size="sm"><Link to={createHref}><Plus aria-hidden /> Tạo câu hỏi</Link></Button> : undefined} />
          : <div>
            {query.isError ? <p role="status" className="pb-2 text-xs text-destructive">Không thể cập nhật danh sách. Đang giữ lại dữ liệu đã tải trước đó.</p> : null}
            <ul aria-busy={query.isPlaceholderData} className={query.isPlaceholderData ? "border-t opacity-60 transition-opacity" : "border-t"}>
              {items.map((item) => <QuestionListItem key={item.id} item={item}
                canEdit={canEdit} canDelete={!!activeBank?.can_edit && !query.isPlaceholderData} onDelete={() => setDeleting(item)} />)}
            </ul>
            {query.data && !query.isPlaceholderData && query.data.total > PAGE_SIZE ? <DataTablePagination page={query.data.page} limit={query.data.limit}
              total={query.data.total} onPageChange={setPage} className="border-t-0 px-1" /> : null}
          </div>}
      </section>}
    </div>
    {addingCategory && bankId != null ? <CategoryCreateDialog bankId={bankId} onClose={() => setAddingCategory(false)} onCreated={(category) => {
      cache.setQueryData<QuestionCategory[]>(queryKeys.questionBanks.categories(category.bank_id), (current) => [...(current ?? []).filter((item) => item.id !== category.id), category]);
      select(category.bank_id, category.id);
    }} /> : null}
    {deleting ? <QuestionDeleteDialog question={deleting} onClose={() => setDeleting(null)} onDeleted={() => void cache.invalidateQueries({ queryKey: queryKeys.questions.all })} /> : null}
  </div>;
}
