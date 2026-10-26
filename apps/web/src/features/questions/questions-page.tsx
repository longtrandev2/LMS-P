import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileQuestion, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/data-table-pagination";
import { PageHeader } from "@/components/page-header";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/state-blocks";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Course, Paginated, QuestionBank, QuestionCategory, QuestionSummary } from "@/types/api";
import { QuestionBankSidebar } from "./question-bank-sidebar";
import { QuestionBankToolbar } from "./question-bank-toolbar";
import { QuestionDeleteDialog } from "./question-delete-dialog";
import { QuestionListFilters } from "./question-list-filters";
import { QuestionListItem } from "./question-list-item";

const PAGE_SIZE = 12;
const toId = (value: string | null) => (value && Number(value) > 0 ? Number(value) : null);

/** Ngân hàng câu hỏi: chọn ngân hàng/danh mục (lưu trên URL `?bank=&category=`), lọc, danh sách câu. */
export function QuestionsPage() {
  const { status: guard, user } = useAuthGuard(["admin", "lecturer"]);
  const canAuthor = !!user?.roles.includes("lecturer");
  const cache = useQueryClient();
  const [params, setParams] = useSearchParams();
  const bankId = toId(params.get("bank"));
  const categoryId = toId(params.get("category"));
  const [courseId, setCourseId] = useState<number | null>(null);
  const [filters, setFilters] = useState({ search: "", type: "", difficulty: "" });
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<QuestionSummary | null>(null);

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
  if (guard !== "ok") return null;

  const select = (bank: number | null, category: number | null) => {
    setPage(1);
    setParams(bank == null ? {} : { bank: String(bank), ...(category != null ? { category: String(category) } : {}) }, { replace: true });
  };
  const setFilter = (patch: Partial<typeof filters>) => { setFilters((current) => ({ ...current, ...patch })); setPage(1); };
  const refreshAll = () => { void cache.invalidateQueries({ queryKey: queryKeys.questionBanks.all }); void cache.invalidateQueries({ queryKey: queryKeys.questions.all }); };
  const activeBank = banks.data?.find((item) => item.id === bankId);
  const canEdit = canAuthor && !!activeBank?.can_edit;
  const items = bankId == null ? [] : query.data?.items ?? [];
  const createHref = bankId != null ? `/questions/new?bank=${bankId}${categoryId != null ? `&category=${categoryId}` : ""}` : "";

  return <div className="space-y-6">
    <PageHeader title="Ngân hàng câu hỏi" description="Soạn câu hỏi theo ngân hàng của học phần và dùng lại trong bài tập, quiz."
      actions={canEdit ? <Button asChild variant="cta"><Link to={createHref}><Plus aria-hidden /> Tạo câu hỏi</Link></Button> : null} />
    {courses.isError ? <ErrorState error={courses.error} onRetry={() => courses.refetch()} /> : banks.isError ? <ErrorState error={banks.error} onRetry={() => banks.refetch()} /> : <div className="grid items-start gap-5 lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)]">
      <QuestionBankSidebar courses={courses.data?.items ?? []} banks={banks.data ?? []} courseId={courseId} bankId={bankId} canCreate={canAuthor}
        coursesLoading={courses.isPending} banksLoading={banks.isPending}
        onCourseChange={(id) => { setCourseId(id); if (id != null && activeBank?.course_id !== id) select(null, null); }}
        onBankChange={(id) => select(id, null)}
        onBankCreated={(bank) => {
          cache.setQueryData<QuestionBank[]>(queryKeys.questionBanks.list(), (current) => [...(current ?? []).filter((item) => item.id !== bank.id), bank]);
          refreshAll(); select(bank.id, null);
        }} />
      <div className="min-w-0 space-y-4">
        <QuestionBankToolbar bank={activeBank} categories={categories.data ?? []} categoryId={categoryId} categoriesLoading={bankId != null && categories.isPending}
          canAuthor={canAuthor} onCategoryChange={(id) => select(bankId, id)} onChanged={refreshAll}
          onCategoryCreated={(category) => {
            cache.setQueryData<QuestionCategory[]>(queryKeys.questionBanks.categories(category.bank_id), (current) => [...(current ?? []).filter((item) => item.id !== category.id), category]);
            select(category.bank_id, category.id);
          }} />
        <section className="overflow-hidden rounded-xl border bg-card" aria-labelledby="question-list-title">
          <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
            <h2 id="question-list-title" className="text-sm font-semibold">Câu hỏi</h2>
            {query.data && !query.isPlaceholderData ? <Badge variant="secondary" className="tabular-nums">{query.data.total}</Badge> : null}
            {query.isPlaceholderData ? <span role="status" className="text-xs text-muted-foreground">Đang tải…</span> : null}
          </div>
          <QuestionListFilters search={filters.search} type={filters.type} difficulty={filters.difficulty} disabled={bankId == null}
            onSearch={(search) => setFilter({ search })} onType={(type) => setFilter({ type })} onDifficulty={(difficulty) => setFilter({ difficulty })} />
          {query.isError && !query.data ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : bankId != null && query.isPending ? <ListSkeleton rows={5} /> : items.length === 0 ? (
            <EmptyState compact icon={FileQuestion} title={bankId == null ? "Chọn ngân hàng để xem câu hỏi" : "Chưa có câu hỏi phù hợp"}
              description={bankId == null ? "Chọn một ngân hàng ở danh sách bên trái, hoặc tạo ngân hàng trong học phần." : "Thử đổi bộ lọc hoặc tạo câu hỏi mới."}
              action={bankId != null && canEdit ? <Button asChild size="sm"><Link to={createHref}><Plus aria-hidden /> Tạo câu hỏi</Link></Button> : undefined} />
          ) : <>
            {query.isError ? <p role="status" className="border-b px-4 py-2 text-xs text-destructive">Không thể cập nhật danh sách. Đang giữ lại dữ liệu đã tải trước đó.</p> : null}
            <div aria-busy={query.isPlaceholderData} className={query.isPlaceholderData ? "opacity-60 transition-opacity" : undefined}>
              {items.map((item, index) => <QuestionListItem key={item.id} item={item} position={(page - 1) * PAGE_SIZE + index + 1}
                canEdit={canEdit} canDelete={!!activeBank?.can_edit && !query.isPlaceholderData} onDelete={() => setDeleting(item)} />)}
            </div>
            {query.data && !query.isPlaceholderData ? <DataTablePagination page={query.data.page} limit={query.data.limit} total={query.data.total} onPageChange={setPage} /> : null}
          </>}
        </section>
      </div>
    </div>}
    {deleting ? <QuestionDeleteDialog question={deleting} onClose={() => setDeleting(null)} onDeleted={() => void cache.invalidateQueries({ queryKey: queryKeys.questions.all })} /> : null}
  </div>;
}
