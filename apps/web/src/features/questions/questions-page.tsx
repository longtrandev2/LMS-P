import { useEffect, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DataTablePagination } from "@/components/data-table-pagination";
import { PageHeader } from "@/components/page-header";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/state-blocks";
import { QuestionFormDialog } from "@/features/questions/question-form-dialog";
import { QuestionBankSidebar, QuestionBankToolbar } from "@/features/questions/question-bank-controls";
import { QuestionListItem } from "@/features/questions/question-list-item";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import { queryKeys } from "@/lib/query-keys";
import type { Course, Paginated, Question, QuestionBank, QuestionCategory, QuestionSummary } from "@/types/api";

const PAGE_SIZE = 12;

export function QuestionsPage() {
  const { status: guard, user } = useAuthGuard(["admin", "lecturer"]);
  const canAuthor = !!user?.roles.includes("lecturer");
  const cache = useQueryClient();
  const [courseId, setCourseId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [topic, setTopic] = useState("");
  const [type, setType] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [bankId, setBankId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [deleting, setDeleting] = useState<QuestionSummary | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  useEffect(() => setPage(1), [search, topic, type, difficulty, courseId, bankId, categoryId]);

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
  function selectCourse(id: number | null) {
    setCourseId(id); setBankId(null); setCategoryId(null);
  }
  function selectBank(id: number) {
    const selected = banks.data?.find((item) => item.id === id);
    setCourseId(selected?.course_id ?? null); setBankId(id); setCategoryId(null);
  }
  function addCreatedBank(bank: QuestionBank) {
    cache.setQueryData<QuestionBank[]>(queryKeys.questionBanks.list(), (current) => [
      ...(current ?? []).filter((item) => item.id !== bank.id), bank,
    ]);
    setCourseId(bank.course_id ?? null); setBankId(bank.id); setCategoryId(null);
  }
  function addCreatedCategory(category: QuestionCategory) {
    cache.setQueryData<QuestionCategory[]>(queryKeys.questionBanks.categories(category.bank_id), (current) => [
      ...(current ?? []).filter((item) => item.id !== category.id), category,
    ]);
    setCategoryId(category.id);
  }

  const filters = { page, limit: PAGE_SIZE, bank_id: bankId ?? undefined, category_id: categoryId ?? undefined, q: search.trim() || undefined, topic: topic.trim() || undefined, type: type || undefined, difficulty: difficulty || undefined };
  const query = useQuery({
    queryKey: queryKeys.questions.list(filters),
    queryFn: ({ signal }) => api.get<Paginated<QuestionSummary>>("/questions", filters, signal),
    placeholderData: keepPreviousData,
    enabled: guard === "ok" && bankId != null,
  });
  if (guard !== "ok") return null;

  async function editQuestion(item: QuestionSummary) {
    setLoadingId(item.id);
    try {
      const question = await api.get<Question>(`/questions/${item.id}`);
      setCourseId(question.course_id ?? null); setBankId(question.bank_id); setCategoryId(question.category_id); setEditing(question); setFormOpen(true);
    }
    catch (error) { toast.error(errorText(error)); }
    finally { setLoadingId(null); }
  }
  async function deleteQuestion() {
    if (!deleting) return;
    try {
      await api.delete(`/questions/${deleting.id}`);
      toast.success("Đã đưa câu hỏi ra khỏi ngân hàng."); setDeleting(null);
      cache.invalidateQueries({ queryKey: queryKeys.questions.all });
    } catch (error) { toast.error(errorText(error)); }
  }
  function openCreate() {
    if (bankId == null) { toast.error("Chọn hoặc tạo ngân hàng trước."); return; }
    if (!banks.data?.find((item) => item.id === bankId)?.can_edit) { toast.error("Bạn chỉ được xem ngân hàng này."); return; }
    setEditing(null); setFormOpen(true);
  }
  const items = bankId == null ? [] : query.data?.items ?? [];
  const activeBank = banks.data?.find((item) => item.id === bankId);

  return (
    <div className="space-y-6">
      <PageHeader title="Ngân hàng câu hỏi" description="Giảng viên tạo ngân hàng theo học phần và chia sẻ khi cần." actions={canAuthor && activeBank?.can_edit ? <Button onClick={openCreate}><Plus aria-hidden /> Thêm câu hỏi</Button> : null} />
      {courses.isError ? <ErrorState error={courses.error} onRetry={() => courses.refetch()} /> : banks.isError ? <ErrorState error={banks.error} onRetry={() => banks.refetch()} /> : <div className="grid items-start gap-5 lg:grid-cols-[minmax(250px,290px)_minmax(0,1fr)]">
      <QuestionBankSidebar courses={courses.data?.items ?? []} banks={banks.data ?? []} courseId={courseId} bankId={bankId} canCreate={canAuthor}
        coursesLoading={courses.isPending} banksLoading={banks.isPending} onCourseChange={selectCourse} onBankChange={selectBank} onBankCreated={addCreatedBank}
        onChanged={() => { void cache.invalidateQueries({ queryKey: queryKeys.questionBanks.all }); void cache.invalidateQueries({ queryKey: queryKeys.questions.all }); }} />
      <div className="min-w-0 space-y-4">
      <QuestionBankToolbar bank={activeBank} categories={categories.data ?? []} categoryId={categoryId} categoriesLoading={categories.isPending}
        canAuthor={canAuthor} onCategoryChange={setCategoryId} onCategoryCreated={addCreatedCategory}
        onChanged={() => { void cache.invalidateQueries({ queryKey: queryKeys.questionBanks.all }); void cache.invalidateQueries({ queryKey: queryKeys.questions.all }); }} />
      <section className="overflow-hidden rounded-xl border bg-card shadow-[0_2px_8px_rgb(15_30_45/0.025)]" aria-labelledby="question-list-title">
        <div className="flex flex-wrap items-center gap-2 border-b px-5 py-4"><h2 id="question-list-title" className="text-base font-semibold">Câu hỏi</h2>{query.data && !query.isPlaceholderData ? <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{query.data.total}</span> : null}{query.isPlaceholderData ? <span role="status" className="text-xs text-muted-foreground">Đang tải ngân hàng được chọn…</span> : null}</div>
        <div className="grid grid-cols-2 gap-3 border-b bg-muted/20 p-4 sm:p-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_150px_150px]">
          <div className="relative col-span-2 xl:col-span-1"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm nội dung câu hỏi…" aria-label="Tìm câu hỏi" disabled={!bankId} className="bg-card pl-10" /></div>
          <Input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Chủ đề" aria-label="Lọc theo chủ đề" disabled={!bankId} className="col-span-2 bg-card xl:col-span-1" />
          <select value={type} onChange={(event) => setType(event.target.value)} aria-label="Lọc theo loại câu hỏi" disabled={!bankId} className="h-10 min-w-0 rounded-lg border border-input bg-card px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"><option value="">Tất cả loại</option><option value="mcq">Trắc nghiệm</option><option value="programming">Lập trình</option></select>
          <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} aria-label="Lọc theo độ khó" disabled={!bankId} className="h-10 min-w-0 rounded-lg border border-input bg-card px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"><option value="">Mọi độ khó</option><option value="easy">Dễ</option><option value="medium">Trung bình</option><option value="hard">Khó</option></select>
        </div>
      {query.isError && !query.data ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : bankId != null && query.isPending && !query.data ? <TableSkeleton rows={5} cols={2} /> : items.length === 0 ? (
        <EmptyState compact title={bankId == null ? "Chọn ngân hàng để xem câu hỏi" : "Chưa có câu hỏi phù hợp"} description={bankId == null ? "Chọn một ngân hàng ở danh sách bên trái, hoặc tạo ngân hàng trong học phần." : "Thử đổi bộ lọc hoặc thêm câu hỏi mới."} />
      ) : <>
        {query.isError ? <p role="status" className="border-b px-5 py-2 text-xs text-destructive">Không thể cập nhật danh sách. Đang giữ lại dữ liệu đã tải trước đó.</p> : null}
        <div aria-busy={query.isPlaceholderData} className={query.isPlaceholderData ? "opacity-60 transition-opacity" : undefined}>
          {items.map((item, index) => <QuestionListItem key={item.id} item={item} position={(page - 1) * PAGE_SIZE + index + 1} busy={loadingId === item.id} canEdit={canAuthor && !!activeBank?.can_edit && !query.isPlaceholderData} canDelete={!!activeBank?.can_edit && !query.isPlaceholderData} onEdit={() => editQuestion(item)} onDelete={() => setDeleting(item)} />)}
        </div>
        {query.data && !query.isPlaceholderData ? <DataTablePagination page={query.data.page} limit={query.data.limit} total={query.data.total} onPageChange={setPage} /> : null}
      </>}
      </section>
      </div>
      </div>}
      {formOpen ? <QuestionFormDialog key={editing?.id ?? "new"} question={editing} bankId={bankId} categoryId={categoryId} onOpenChange={setFormOpen} onSaved={() => cache.invalidateQueries({ queryKey: queryKeys.questions.all })} /> : null}
      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle className="font-heading">Xóa câu hỏi khỏi ngân hàng?</AlertDialogTitle><AlertDialogDescription>Câu hỏi sẽ được ẩn khỏi danh sách và không thể thêm vào bài mới. Snapshot của bài đã xuất bản vẫn được giữ nguyên.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Hủy</AlertDialogCancel><AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={deleteQuestion}><Trash2 aria-hidden /> Xóa câu hỏi</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
