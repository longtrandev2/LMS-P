import { useState } from "react";
import { Divide, ListPlus, Library, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/state-blocks";
import { DrawDialog } from "./draw-dialog";
import { EditorSection } from "./editor-layout";
import { formatPoints } from "./labels";
import { QuestionPickerSheet } from "./question-picker-sheet";
import { QuestionPreviewDialog } from "./question-preview-dialog";
import { SelectedQuestionRow } from "./selected-question-row";
import { splitEvenly, totalPoints, type EditorForm, type FieldErrors, type SelectedQuestion } from "./editor-model";
import type { QuestionSummary } from "@/types/api";

const DEFAULT_POINTS = "1";

export function EditorQuestionsSection({ classId, form, patch, errors, locked }: {
  classId: number; form: EditorForm; patch: (next: Partial<EditorForm>) => void; errors: FieldErrors; locked: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [drawOpen, setDrawOpen] = useState(false);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [target, setTarget] = useState("10");
  const questions = form.questions;
  const quiz = form.category === "quiz";
  const existing = new Set(questions.map((q) => q.question_id));
  const total = totalPoints(questions);

  const setQuestions = (next: SelectedQuestion[]) => patch({ questions: next });
  function add(items: QuestionSummary[]) {
    const fresh = items.filter((item) => !existing.has(item.id)).map((item) => ({
      question_id: item.id, type: item.type, content: item.content, difficulty: item.difficulty, bank_name: item.bank_name, points: DEFAULT_POINTS,
    }));
    setQuestions([...questions, ...fresh]);
  }
  function move(index: number, direction: -1 | 1) {
    const next = [...questions];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    setQuestions(next);
  }
  function distribute() {
    const value = Number(target.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0 || questions.length === 0) return;
    const parts = splitEvenly(value, questions.length);
    setQuestions(questions.map((q, index) => ({ ...q, points: parts[index] })));
  }

  return <EditorSection id="questions" title="Câu hỏi"
    description={locked ? "Câu hỏi, điểm và thứ tự đã được ghim khi xuất bản." : "Chọn tay từ ngân hàng hoặc bốc ngẫu nhiên theo quy tắc; sắp thứ tự và đặt điểm từng câu."}>
    {locked ? null : <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => setPickerOpen(true)}><Library aria-hidden />Chọn từ ngân hàng</Button>
        <Button type="button" variant="secondary" onClick={() => setDrawOpen(true)}><Shuffle aria-hidden />Bốc ngẫu nhiên</Button>
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor="target-total" className="text-sm text-muted-foreground">Tổng điểm</label>
        <Input id="target-total" type="number" inputMode="decimal" min={0.01} step={0.5} className="w-20 text-right tabular-nums"
          value={target} onChange={(event) => setTarget(event.target.value)} />
        <Button type="button" variant="secondary" disabled={questions.length === 0} onClick={distribute}><Divide aria-hidden />Chia đều</Button>
      </div>
    </div>}

    {questions.length === 0 ? <div className="rounded-lg bg-secondary/50">
      <EmptyState compact icon={ListPlus} title="Đề chưa có câu nào" description={quiz ? "Quiz nhận mọi loại câu trừ lập trình." : "Bài tập nhận mọi loại câu, kể cả lập trình."} />
    </div> : <div className="space-y-2">
      <p className="flex items-center justify-between gap-2 px-1 text-xs text-muted-foreground tabular-nums" aria-live="polite">
        <span>{questions.length} câu trong đề</span>
        <span>Tổng <span className="font-semibold text-foreground">{formatPoints(total)}</span> điểm</span>
      </p>
      <ol className="space-y-1.5">
        {questions.map((question, index) => <SelectedQuestionRow key={question.question_id} index={index} count={questions.length}
          question={question} error={errors[`points:${question.question_id}`]} invalidType={quiz && question.type === "programming"} locked={locked}
          onPoints={(points) => setQuestions(questions.map((q) => q.question_id === question.question_id ? { ...q, points } : q))}
          onMove={(direction) => move(index, direction)} onPreview={() => setPreviewId(question.question_id)}
          onRemove={() => setQuestions(questions.filter((q) => q.question_id !== question.question_id))} />)}
      </ol>
    </div>}
    {errors.questions ? <p role="alert" className="text-sm text-destructive">{errors.questions}</p> : null}

    <QuestionPickerSheet open={pickerOpen} onOpenChange={setPickerOpen} classId={classId} quiz={quiz} existing={existing} onAdd={add} />
    <DrawDialog open={drawOpen} onOpenChange={setDrawOpen} classId={classId} quiz={quiz} existing={existing} onAdd={add} />
    <QuestionPreviewDialog questionId={previewId} onOpenChange={(value) => !value && setPreviewId(null)} />
  </EditorSection>;
}
