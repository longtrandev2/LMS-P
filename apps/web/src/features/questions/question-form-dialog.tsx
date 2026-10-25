import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { QuestionOptionFields } from "@/features/questions/question-option-fields";
import { QuestionProgrammingFields } from "@/features/questions/question-programming-fields";
import { QuestionTestCaseFields } from "@/features/questions/question-test-case-fields";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import { queryKeys } from "@/lib/query-keys";
import type { Question, QuestionCategory, QuestionDifficulty, QuestionOption, QuestionProgramming, QuestionTestCase, QuestionType } from "@/types/api";

const emptyProgramming: QuestionProgramming = { starter_code: "", solution_code: "", allowed_languages: null, time_limit_ms: 5000, memory_limit_mb: 256 };
const emptyOption = (): QuestionOption => ({ content: "", is_correct: false, position: 0 });
const emptyCase = (): QuestionTestCase => ({ input: "", expected_output: "", is_public: true, weight: 1, position: 0 });

export function QuestionFormDialog({ question, bankId, categoryId, onOpenChange, onSaved }: { question: Question | null; bankId: number | null; categoryId: number | null; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const targetBankId = question?.bank_id ?? bankId;
  const [selectedCategory, setSelectedCategory] = useState<number | null>(question?.category_id ?? categoryId);
  const [type, setType] = useState<QuestionType>(question?.type ?? "mcq");
  const [content, setContent] = useState(question?.content ?? "");
  const [topic, setTopic] = useState(question?.topic ?? "");
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>(question?.difficulty ?? "medium");
  const [options, setOptions] = useState<QuestionOption[]>(question?.options ?? [emptyOption(), { ...emptyOption(), position: 1 }]);
  const [programming, setProgramming] = useState<QuestionProgramming>(question?.programming ?? emptyProgramming);
  const [testCases, setTestCases] = useState<QuestionTestCase[]>(question?.test_cases ?? []);
  const [submitting, setSubmitting] = useState(false);
  const categoryQuery = useQuery({
    queryKey: queryKeys.questionBanks.categories(targetBankId ?? undefined),
    queryFn: ({ signal }) => api.get<QuestionCategory[]>(`/question-banks/${targetBankId}/categories`, undefined, signal),
    enabled: targetBankId != null,
  });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!content.trim()) { toast.error("Nhập nội dung câu hỏi trước khi lưu."); return; }
    if (targetBankId == null) { toast.error("Chọn học phần hoặc ngân hàng cá nhân trước khi thêm câu hỏi."); return; }
    if (type === "mcq" && (options.length < 2 || options.filter((row) => row.is_correct).length !== 1 || options.some((row) => !row.content.trim()))) {
      toast.error("MCQ cần ít nhất 2 lựa chọn có nội dung và đúng 1 đáp án chính xác."); return;
    }
    setSubmitting(true);
    const body = {
      bank_id: targetBankId, category_id: selectedCategory ?? undefined, type, content: content.trim(), topic: topic.trim(), difficulty,
      options: type === "mcq" ? options.map(({ content: text, is_correct }) => ({ content: text.trim(), is_correct })) : undefined,
      programming: type === "programming" ? { ...programming, allowed_languages: programming.allowed_languages?.length ? programming.allowed_languages : null } : undefined,
    };
    try {
      const saved = question
        ? await api.patch<Question>(`/questions/${question.id}`, body)
        : await api.post<Question>("/questions", body);
      if (type === "programming" && (question || testCases.length > 0)) {
        await api.put(`/questions/${saved.id}/test-cases`, testCases.map(({ input, expected_output, is_public, weight }) => ({ input, expected_output, is_public, weight })));
      }
      toast.success(question ? "Đã cập nhật câu hỏi và tạo phiên bản mới." : "Đã thêm câu hỏi vào ngân hàng.");
      onSaved(); onOpenChange(false);
    } catch (error) { toast.error(errorText(error)); }
    finally { setSubmitting(false); }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle className="font-heading">{question ? "Sửa câu hỏi" : "Tạo câu hỏi"}</DialogTitle><DialogDescription>{question ? `Đang sửa phiên bản ${question.version_no}. Bản đã gắn vào bài đã xuất bản sẽ không thay đổi.` : "Câu hỏi và test case được lưu thành phiên bản để dùng lại trong bài tập và quiz."}</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="space-y-5" noValidate>
          <div className="space-y-2"><Label htmlFor="question-category-select">Danh mục (tùy chọn)</Label><select id="question-category-select" value={selectedCategory ?? ""} onChange={(event) => setSelectedCategory(event.target.value ? Number(event.target.value) : null)} className="h-9 w-full rounded-md border bg-background px-3 text-sm"><option value="">Chưa phân loại (mặc định)</option>{categoryQuery.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{categoryQuery.isError ? <p className="text-xs text-destructive">Không tải được danh mục ngân hàng.</p> : null}</div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2"><Label htmlFor="question-type">Loại câu hỏi</Label><select id="question-type" value={type} disabled={!!question} onChange={(event) => setType(event.target.value as QuestionType)} className="h-9 w-full rounded-md border bg-background px-3 text-sm"><option value="mcq">Trắc nghiệm</option><option value="programming">Lập trình</option></select></div>
            <div className="space-y-2"><Label htmlFor="question-difficulty">Độ khó</Label><select id="question-difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value as QuestionDifficulty)} className="h-9 w-full rounded-md border bg-background px-3 text-sm"><option value="easy">Dễ</option><option value="medium">Trung bình</option><option value="hard">Khó</option></select></div>
            <div className="space-y-2"><Label htmlFor="question-topic">Chủ đề</Label><Input id="question-topic" value={topic} maxLength={100} onChange={(event) => setTopic(event.target.value)} placeholder="VD: Cây nhị phân" /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="question-content">Nội dung đề bài</Label><Textarea id="question-content" value={content} onChange={(event) => setContent(event.target.value)} rows={5} placeholder="Nhập nội dung câu hỏi…" /></div>
          {type === "mcq" ? <QuestionOptionFields rows={options} onChange={setOptions} /> : <>
            <QuestionProgrammingFields value={programming} onChange={setProgramming} />
            <QuestionTestCaseFields rows={testCases} onChange={setTestCases} />
          </>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Hủy</Button>
            <Button type="submit" disabled={submitting || !targetBankId}>{submitting ? "Đang lưu…" : question ? "Lưu và tạo phiên bản mới" : "Tạo câu hỏi"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
