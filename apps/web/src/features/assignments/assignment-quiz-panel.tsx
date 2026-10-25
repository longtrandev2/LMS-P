import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import { queryKeys } from "@/lib/query-keys";
import { assignmentWindow } from "@/features/assignments/submission-window";
import type { AssignmentDetails, QuizAttempt } from "@/types/api";

export function AssignmentQuizPanel({ details }: { details: AssignmentDetails }) {
  const item = details.assignment;
  const client = useQueryClient();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const idempotencyKey = useRef<string | null>(null);
  const history = useQuery({ queryKey: queryKeys.assignments.quizAttempts(item.id), queryFn: () => api.get<QuizAttempt[]>(`/assignments/${item.id}/quiz-attempts`) });
  const used = history.data?.length ?? 0;
  const canAttempt = item.max_attempts == null || used < item.max_attempts;
  const window = assignmentWindow(item);

  async function submit() {
    idempotencyKey.current ??= crypto.randomUUID();
    setSubmitting(true);
    try {
      await api.post<QuizAttempt>(`/assignments/${item.id}/quiz-attempts`, {
        answers: details.questions.map((question) => ({ question_id: question.question_id, selected_option_ids: answers[question.question_id] ? [answers[question.question_id]] : [] })),
      }, { headers: { "Idempotency-Key": idempotencyKey.current } });
      idempotencyKey.current = null;
      setAnswers({});
      await client.invalidateQueries({ queryKey: queryKeys.assignments.quizAttempts(item.id) });
      toast.success("Đã nộp quiz và chấm điểm.");
    } catch (error) { toast.error(errorText(error)); }
    finally { setSubmitting(false); }
  }

  return <div className="space-y-5">
    <div className="flex flex-wrap justify-between gap-2 rounded-lg bg-muted/50 p-3 text-sm"><span>{details.questions.length} câu · {item.total_points} điểm</span><span>Lượt đã dùng: {used}{item.max_attempts == null ? " · Không giới hạn" : ` / ${item.max_attempts}`}</span></div>
    {details.questions.map((question, index) => <fieldset key={question.question_id} className="space-y-3 rounded-xl border p-4">
      <legend className="px-1 text-sm font-semibold">Câu {index + 1} · {question.points} điểm</legend><p className="whitespace-pre-wrap text-sm">{question.content}</p>
      <div className="space-y-2">{question.options.map((option) => <label key={option.id} className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm hover:bg-muted/50"><input type="radio" name={`quiz-${item.id}-${question.question_id}`} checked={answers[question.question_id] === option.id} disabled={!canAttempt || submitting} onChange={() => setAnswers((current) => ({ ...current, [question.question_id]: option.id }))} /><span>{option.content}</span></label>)}</div>
    </fieldset>)}
    {history.isError ? <p className="text-sm text-destructive">Không tải được lịch sử lượt làm quiz.</p> : null}
    {window === "late" ? <p className="text-sm text-amber-700">Bạn đang nộp muộn; điểm sẽ bị trừ {item.late_penalty_percent}%.</p> : null}
    {window === "closed" ? <p className="text-sm text-destructive">Đã hết thời gian nhận bài.</p> : null}
    <Button onClick={submit} disabled={history.isPending || !canAttempt || window === "closed" || submitting || details.questions.length === 0}>{submitting ? "Đang nộp…" : canAttempt ? "Nộp toàn bộ quiz" : "Đã hết lượt làm"}</Button>
    {history.data?.length ? <section className="space-y-2 border-t pt-4"><h3 className="font-semibold">Lịch sử làm bài</h3>{history.data.map((attempt) => <div key={attempt.attempt_id} className="rounded-lg border p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><strong>Lượt {attempt.attempt_no}: {attempt.score} / {item.total_points} điểm</strong><span className="text-muted-foreground">{new Date(attempt.submitted_at).toLocaleString("vi-VN")}{attempt.is_late ? ` · Nộp muộn, phạt ${attempt.late_penalty_percent}%` : ""}</span></div><p className="mt-2 text-xs text-muted-foreground">{attempt.question_scores.map((row, i) => `Câu ${i + 1}: ${row.score}/${row.max_score}`).join(" · ")}</p></div>)}</section> : null}
  </div>;
}
