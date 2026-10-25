import { useEffect, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DataTablePagination } from "@/components/data-table-pagination";
import { PageHeader } from "@/components/page-header";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/state-blocks";
import { QuestionFormDialog } from "@/features/questions/question-form-dialog";
import { QuestionBankControls } from "@/features/questions/question-bank-controls";
import { QuestionListItem } from "@/features/questions/question-list-item";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import { queryKeys } from "@/lib/query-keys";
import type { Course, Paginated, Question, QuestionBank, QuestionCategory, QuestionSummary } from "@/types/api";

const PAGE_SIZE = 12;

export function QuestionsPage() {
  const { status: guard } = useAuthGuard(["admin", "lecturer"]);
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
  useEffect(() => {
    if (courseId == null || bankId != null || banks.isPending) return;
    const existing = banks.data?.find((bank) => bank.course_id === courseId);
    if (existing) setBankId(existing.id);
  }, [courseId, bankId, banks.data, banks.isPending]);
  function selectCourse(id: number | null) {
    setCourseId(id); setCategoryId(null);
    setBankId(id == null ? null : banks.data?.find((bank) => bank.course_id === id)?.id ?? null);
  }
  function selectPersonalBank(id: number | null) {
    setCourseId(null); setBankId(id); setCategoryId(null);
  }
  async function ensureCourseBank() {
    if (courseId == null) throw new Error("Chọn học phần trước khi thêm câu hỏi.");
    const existing = banks.data?.find((bank) => bank.id === bankId && bank.course_id === courseId);
    if (existing) return existing;
    const bank = await api.put<QuestionBank>(`/courses/${courseId}/question-bank`);
    setBankId(bank.id); setCategoryId(null);
    cache.setQueryData<QuestionBank[]>(queryKeys.questionBanks.list(), (current) => [
      ...(current ?? []).filter((item) => item.id !== bank.id), bank,
    ]);
    return bank;
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
    if (bankId == null && courseId == null) { toast.error("Chọn học phần hoặc ngân hàng cá nhân trước."); return; }
    const ready = bankId == null ? ensureCourseBank() : Promise.resolve(null);
    void ready.then(() => { setEditing(null); setFormOpen(true); }).catch((error) => toast.error(errorText(error)));
  }
  const items = query.data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Ngân hàng câu hỏi" description="Thêm câu hỏi vào học phần; sắp xếp theo chương khi cần." actions={<Button onClick={openCreate} disabled={!courseId && !bankId}><Plus aria-hidden /> Thêm câu hỏi</Button>} />
      <QuestionBankControls courses={courses.data?.items ?? []} banks={banks.data ?? []} categories={categories.data ?? []}
        courseId={courseId} bankId={bankId} categoryId={categoryId} onCourseChange={selectCourse}
        onPersonalBankChange={selectPersonalBank} onCategoryChange={setCategoryId} onEnsureCourseBank={ensureCourseBank}
        onChanged={() => { cache.invalidateQueries({ queryKey: queryKeys.questionBanks.all }); cache.invalidateQueries({ queryKey: queryKeys.questions.all }); }} />
      <section className="overflow-hidden rounded-xl border bg-card shadow-[0_2px_8px_rgb(15_30_45/0.025)]" aria-labelledby="question-list-title">
        <div className="flex flex-wrap items-center gap-2 border-b px-5 py-4"><h2 id="question-list-title" className="text-base font-semibold">Câu hỏi</h2>{query.data ? <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{query.data.total}</span> : null}</div>
        <div className="grid grid-cols-2 gap-3 border-b bg-muted/20 p-4 sm:p-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_150px_150px]">
          <div className="relative col-span-2 xl:col-span-1"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm nội dung câu hỏi…" aria-label="Tìm câu hỏi" className="bg-card pl-10" /></div>
          <Input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Chủ đề" aria-label="Lọc theo chủ đề" className="col-span-2 bg-card xl:col-span-1" />
          <select value={type} onChange={(event) => setType(event.target.value)} aria-label="Lọc theo loại câu hỏi" className="h-10 min-w-0 rounded-lg border border-input bg-card px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"><option value="">Tất cả loại</option><option value="mcq">Trắc nghiệm</option><option value="programming">Lập trình</option></select>
          <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} aria-label="Lọc theo độ khó" className="h-10 min-w-0 rounded-lg border border-input bg-card px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"><option value="">Mọi độ khó</option><option value="easy">Dễ</option><option value="medium">Trung bình</option><option value="hard">Khó</option></select>
        </div>
      {courses.isError ? <ErrorState error={courses.error} onRetry={() => courses.refetch()} /> : courseId != null && banks.isPending ? <div className="p-5"><CardGridSkeleton count={3} /></div> : bankId != null && query.isPending ? <div className="p-5"><CardGridSkeleton count={3} /></div> : query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : items.length === 0 ? (
        <EmptyState compact title={!courseId && !bankId ? "Chọn học phần để xem câu hỏi" : bankId == null ? "Chưa có câu hỏi trong học phần" : "Chưa có câu hỏi phù hợp"} description={bankId == null && courseId != null ? "Thêm câu hỏi đầu tiên; ngân hàng học phần sẽ tự được tạo." : "Thử đổi bộ lọc hoặc thêm câu hỏi mới bằng nút phía trên."} />
      ) : <>
        <div>
          {items.map((item, index) => <QuestionListItem key={item.id} item={item} position={(page - 1) * PAGE_SIZE + index + 1} busy={loadingId === item.id} onEdit={() => editQuestion(item)} onDelete={() => setDeleting(item)} />)}
        </div>
        {query.data ? <DataTablePagination page={query.data.page} limit={query.data.limit} total={query.data.total} onPageChange={setPage} /> : null}
      </>}
      </section>
      {formOpen ? <QuestionFormDialog key={editing?.id ?? "new"} question={editing} bankId={bankId} categoryId={categoryId} onOpenChange={setFormOpen} onSaved={() => cache.invalidateQueries({ queryKey: queryKeys.questions.all })} /> : null}
      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle className="font-heading">Xóa câu hỏi khỏi ngân hàng?</AlertDialogTitle><AlertDialogDescription>Câu hỏi sẽ được ẩn khỏi danh sách và không thể thêm vào bài mới. Snapshot của bài đã xuất bản vẫn được giữ nguyên.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Hủy</AlertDialogCancel><AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={deleteQuestion}><Trash2 aria-hidden /> Xóa câu hỏi</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
