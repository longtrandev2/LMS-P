import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { AssignmentCategory, ClassSummary, Paginated, QuestionBank, QuestionCategory, QuestionSummary } from "@/types/api";

const PAGE_SIZE = 30;

export function AssignmentQuestionPicker({ classId, category, selected, points, questionInfo, onToggle, onPoints, onMove, onRemove }: {
  classId: string; category: AssignmentCategory; selected: number[]; points: Record<number, string>;
  questionInfo: Record<number, { content: string; bank_name?: string }>;
  onToggle: (question: QuestionSummary, checked: boolean) => void; onPoints: (id: number, value: string) => void; onMove: (id: number, direction: -1 | 1) => void; onRemove: (id: number) => void;
}) {
  const [bankId, setBankId] = useState<number | null>(null); const [categoryId, setCategoryId] = useState<number | null>(null);
  const [search, setSearch] = useState(""); const [term, setTerm] = useState(""); const [page, setPage] = useState(1);
  const classQuery = useQuery({ queryKey: queryKeys.classes.detail(classId), queryFn: ({ signal }) => api.get<ClassSummary>(`/classes/${classId}`, undefined, signal) });
  const bankQuery = useQuery({
    queryKey: queryKeys.questionBanks.list(classQuery.data?.course_id),
    queryFn: ({ signal }) => api.get<QuestionBank[]>("/question-banks", { course_id: classQuery.data?.course_id }, signal),
    enabled: classQuery.data != null,
  });
  useEffect(() => {
    if (bankId == null && bankQuery.data?.length) setBankId((bankQuery.data.find((bank) => bank.course_id === classQuery.data?.course_id) ?? bankQuery.data[0]).id);
  }, [bankId, bankQuery.data, classQuery.data?.course_id]);
  const categoryQuery = useQuery({
    queryKey: queryKeys.questionBanks.categories(bankId ?? undefined),
    queryFn: ({ signal }) => api.get<QuestionCategory[]>(`/question-banks/${bankId}/categories`, undefined, signal),
    enabled: bankId != null,
  });
  useEffect(() => { const timer = window.setTimeout(() => setTerm(search.trim()), 300); return () => window.clearTimeout(timer); }, [search]);
  useEffect(() => setPage(1), [bankId, categoryId, term]);
  const filters = { bank_id: bankId ?? undefined, category_id: categoryId ?? undefined, q: term || undefined, type: category === "quiz" ? "mcq" : undefined, page, limit: PAGE_SIZE };
  const questionQuery = useQuery({
    queryKey: queryKeys.questions.list(filters),
    queryFn: ({ signal }) => api.get<Paginated<QuestionSummary>>("/questions", filters, signal),
    enabled: bankId != null,
  });
  const available = questionQuery.data?.items ?? [];

  return <fieldset className="space-y-3 rounded-xl border p-4"><legend className="px-1 text-sm font-semibold">Câu hỏi và điểm · đã chọn {selected.length}</legend>
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="space-y-1"><Label htmlFor="assignment-bank">Ngân hàng</Label><select id="assignment-bank" value={bankId ?? ""} onChange={(event) => { setBankId(event.target.value ? Number(event.target.value) : null); setCategoryId(null); }} className="h-9 w-full rounded-md border bg-background px-3 text-sm"><option value="">Chọn ngân hàng</option>{bankQuery.data?.map((bank) => <option key={bank.id} value={bank.id}>{bank.name}{bank.course_name ? ` · ${bank.course_name}` : " · Cá nhân"}</option>)}</select></div>
      <div className="space-y-1"><Label htmlFor="assignment-question-category">Danh mục</Label><select id="assignment-question-category" value={categoryId ?? ""} onChange={(event) => setCategoryId(event.target.value ? Number(event.target.value) : null)} className="h-9 w-full rounded-md border bg-background px-3 text-sm"><option value="">Tất cả danh mục</option>{categoryQuery.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
      <div className="space-y-1"><Label htmlFor="assignment-question-search">Tìm câu hỏi</Label><Input id="assignment-question-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nội dung hoặc chủ đề" /></div>
    </div>
    {selected.length ? <div className="space-y-2"><p className="text-xs font-medium text-muted-foreground">Câu đã chọn</p>{selected.map((id, index) => {
      const question = questionInfo[id];
      return <div key={id} className="flex flex-wrap items-center gap-2 rounded-md border p-2"><span className="w-6 text-xs text-muted-foreground">#{index + 1}</span>
        <span className="min-w-0 flex-1 truncate text-sm">{question?.content ?? `Câu hỏi #${id}`}<span className="ml-2 text-xs text-muted-foreground">{question?.bank_name ?? ""}</span></span>
        <Input aria-label={`Điểm câu ${id}`} type="number" min="0.01" step="0.01" className="w-24" value={points[id] ?? "10"} onChange={(event) => onPoints(id, event.target.value)} />
        <Button type="button" size="icon" variant="ghost" aria-label="Đưa câu lên" disabled={index === 0} onClick={() => onMove(id, -1)}><ArrowUp aria-hidden /></Button>
        <Button type="button" size="icon" variant="ghost" aria-label="Đưa câu xuống" disabled={index === selected.length - 1} onClick={() => onMove(id, 1)}><ArrowDown aria-hidden /></Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => onRemove(id)}>Bỏ chọn</Button>
      </div>;
    })}</div> : null}
    {questionQuery.isPending ? <p className="text-sm text-muted-foreground">Đang tải câu hỏi…</p> : questionQuery.isError ? <p className="text-sm text-destructive">Không tải được câu hỏi. Kiểm tra ngân hàng hoặc thử lại.</p> : available.length === 0 ? <p className="text-sm text-muted-foreground">Không có câu hỏi phù hợp trong danh mục này.</p> : available.map((question) => {
      const checked = selected.includes(question.id);
      return <label key={question.id} className="flex cursor-pointer items-start gap-3 rounded-lg bg-muted/40 p-3"><input type="checkbox" checked={checked} onChange={(event) => onToggle(question, event.target.checked)} />
        <span className="min-w-0 flex-1"><span className="block line-clamp-2 text-sm font-medium">{question.content}</span><span className="block text-xs text-muted-foreground">{question.type === "mcq" ? "Trắc nghiệm" : "Lập trình"} · {question.category_name} · {question.topic ?? "Chưa có chủ đề"}</span></span>
      </label>;
    })}
    {questionQuery.data && questionQuery.data.total > PAGE_SIZE ? <div className="flex items-center justify-between text-sm"><Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Trang trước</Button><span>Trang {page} / {Math.ceil(questionQuery.data.total / PAGE_SIZE)}</span><Button type="button" variant="outline" size="sm" disabled={page * PAGE_SIZE >= questionQuery.data.total} onClick={() => setPage((value) => value + 1)}>Trang sau</Button></div> : null}
  </fieldset>;
}
