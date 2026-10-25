import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import { AssignmentQuestionPicker } from "@/features/assignments/assignment-question-picker";
import type { AssignmentCategory, AssignmentDetails, QuestionSummary, ScorePolicy } from "@/types/api";

function localDateTime(value?: string | null, daysAhead = 7) {
  if (value) return value.slice(0, 16);
  const date = new Date(); date.setDate(date.getDate() + daysAhead);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function AssignmentFormDialog({ classId, details, onOpenChange, onSaved }: {
  classId: string; details: AssignmentDetails | null; onOpenChange: (open: boolean) => void; onSaved: () => void;
}) {
  const initial = details?.assignment;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState<AssignmentCategory>(initial?.category ?? "assignment");
  const [availableFrom, setAvailableFrom] = useState(localDateTime(initial?.available_from, 0));
  const [useAvailableFrom, setUseAvailableFrom] = useState(!!initial?.available_from);
  const [dueAt, setDueAt] = useState(localDateTime(initial?.due_at));
  const [allowLate, setAllowLate] = useState(initial?.allow_late ?? false);
  const [lateDueAt, setLateDueAt] = useState(localDateTime(initial?.late_due_at, 10));
  const [latePenalty, setLatePenalty] = useState(String(initial?.late_penalty_percent ?? 0));
  const [maxAttempts, setMaxAttempts] = useState(initial?.max_attempts ? String(initial.max_attempts) : "");
  const [scorePolicy, setScorePolicy] = useState<ScorePolicy>(initial?.score_policy ?? "best");
  const [selected, setSelected] = useState<number[]>(() => details?.questions.map((row) => row.question_id) ?? []);
  const [points, setPoints] = useState<Record<number, string>>(() => Object.fromEntries(details?.questions.map((row) => [row.question_id, String(row.points)]) ?? []));
  const [questionTypes, setQuestionTypes] = useState<Record<number, string>>(() => Object.fromEntries(details?.questions.map((row) => [row.question_id, row.type]) ?? []));
  const [questionInfo, setQuestionInfo] = useState<Record<number, { content: string; bank_name?: string }>>(() => Object.fromEntries(details?.questions.map((row) => [row.question_id, { content: row.content }]) ?? []));
  const [submitting, setSubmitting] = useState(false);

  function toggleQuestion(question: QuestionSummary, checked: boolean) {
    const id = question.id;
    setSelected((current) => checked ? current.includes(id) ? current : [...current, id] : current.filter((item) => item !== id));
    setQuestionTypes((current) => ({ ...current, [id]: question.type }));
    setQuestionInfo((current) => ({ ...current, [id]: { content: question.content, bank_name: question.bank_name } }));
    if (!points[id]) setPoints((current) => ({ ...current, [id]: "10" }));
  }
  function moveQuestion(id: number, direction: -1 | 1) {
    setSelected((current) => { const index = current.indexOf(id); const target = index + direction; if (target < 0 || target >= current.length) return current; const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next; });
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) { toast.error("Nhập tên bài trước khi lưu."); return; }
    if (category === "quiz" && selected.some((id) => questionTypes[id] !== "mcq")) {
      toast.error("Quiz chỉ được chứa câu trắc nghiệm."); return;
    }
    setSubmitting(true);
    const body = {
      title: title.trim(), description: description.trim() || null, category,
      available_from: useAvailableFrom ? availableFrom : null, due_at: dueAt,
      allow_late: allowLate, late_due_at: allowLate ? lateDueAt : null,
      late_penalty_percent: allowLate ? Number(latePenalty) : 0,
      max_attempts: maxAttempts ? Number(maxAttempts) : null, score_policy: scorePolicy,
      questions: selected.map((question_id, index) => ({ question_id, points: Number(points[question_id] ?? 10), position: index + 1 })),
    };
    try {
      if (details) await api.patch(`/assignments/${details.assignment.id}`, body);
      else await api.post(`/classes/${classId}/assignments`, body);
      toast.success(details ? "Đã lưu bản nháp." : "Đã tạo bản nháp."); onSaved(); onOpenChange(false);
    } catch (error) { toast.error(errorText(error)); }
    finally { setSubmitting(false); }
  }

  return <Dialog open onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
      <DialogHeader><DialogTitle className="font-heading">{details ? "Sửa bài nháp" : "Tạo bài tập hoặc quiz"}</DialogTitle><DialogDescription>Xuất bản sẽ ghim phiên bản câu hỏi, điểm và thứ tự hiện tại.</DialogDescription></DialogHeader>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="assignment-title">Tên bài</Label><Input id="assignment-title" value={title} maxLength={200} onChange={(event) => setTitle(event.target.value)} required /></div>
          <div className="space-y-2"><Label htmlFor="assignment-category">Hạng mục</Label><select id="assignment-category" value={category} onChange={(event) => setCategory(event.target.value as AssignmentCategory)} className="h-9 w-full rounded-md border bg-background px-3 text-sm"><option value="assignment">Bài tập</option><option value="quiz">Quiz</option><option value="midterm">Giữa kỳ</option><option value="final">Cuối kỳ</option></select></div>
        </div>
        <div className="space-y-2"><Label htmlFor="assignment-description">Mô tả</Label><Textarea id="assignment-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={2} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={useAvailableFrom} onChange={(event) => setUseAvailableFrom(event.target.checked)} /> Đặt thời điểm mở bài</label><Input aria-label="Thời điểm mở bài" type="datetime-local" value={availableFrom} disabled={!useAvailableFrom} onChange={(event) => setAvailableFrom(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="assignment-due">Hạn nộp</Label><Input id="assignment-due" type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} required /></div>
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={allowLate} onChange={(event) => setAllowLate(event.target.checked)} /> Cho phép nộp muộn</label>
          <Input aria-label="Hạn nộp muộn" className="max-w-xs" type="datetime-local" value={lateDueAt} disabled={!allowLate} onChange={(event) => setLateDueAt(event.target.value)} />
          <Input aria-label="Phạt nộp muộn phần trăm" className="w-28" type="number" min={0} max={100} value={latePenalty} disabled={!allowLate} onChange={(event) => setLatePenalty(event.target.value)} />
          <span className="text-sm text-muted-foreground">% phạt</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="assignment-attempts">Số lượt tối đa</Label><Input id="assignment-attempts" type="number" min={1} value={maxAttempts} onChange={(event) => setMaxAttempts(event.target.value)} placeholder="Để trống: không giới hạn" /></div>
          <div className="space-y-2"><Label htmlFor="assignment-score-policy">Cách chọn điểm</Label><select id="assignment-score-policy" value={scorePolicy} onChange={(event) => setScorePolicy(event.target.value as ScorePolicy)} className="h-9 w-full rounded-md border bg-background px-3 text-sm"><option value="best">Điểm cao nhất</option><option value="last">Lượt gần nhất</option></select></div>
        </div>
        <AssignmentQuestionPicker classId={classId} category={category} selected={selected} points={points} questionInfo={questionInfo}
          onToggle={toggleQuestion} onPoints={(id, value) => setPoints((current) => ({ ...current, [id]: value }))} onMove={moveQuestion}
          onRemove={(id) => setSelected((current) => current.filter((item) => item !== id))} />
        <DialogFooter><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Hủy</Button><Button type="submit" disabled={submitting}>{submitting ? "Đang lưu…" : "Lưu bản nháp"}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
