import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import { queryKeys } from "@/lib/query-keys";
import { useWebSocket } from "@/lib/ws";
import { useAuthStore } from "@/stores/auth";
import { AssignmentCodePanel } from "@/features/assignments/assignment-code-panel";
import { AssignmentQuestionClassification } from "@/features/assignments/assignment-question-classification";
import { AssignmentSubmissionHistory } from "@/features/assignments/assignment-submission-history";
import { assignmentWindow } from "@/features/assignments/submission-window";
import type { AssignmentDetails, AssignmentSubmission } from "@/types/api";

export function AssignmentPracticePanel({ details, windowStatus }: {
  details: AssignmentDetails; windowStatus?: ReturnType<typeof assignmentWindow>;
}) {
  const item = details.assignment;
  const client = useQueryClient();
  const token = useAuthStore((state) => state.accessToken);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const history = useQuery({
    queryKey: queryKeys.assignments.submissions(item.id),
    queryFn: () => api.get<AssignmentSubmission[]>("/me/submissions", { assignment_id: item.id }),
  });
  const refreshSubmissions = useCallback((type: string) => {
    if (!type.startsWith("submission.")) return;
    void client.invalidateQueries({ queryKey: queryKeys.assignments.submissions(item.id) });
    void client.invalidateQueries({ queryKey: ["submission"] });
  }, [client, item.id]);
  useWebSocket(token, { onMessage: refreshSubmissions });
  const window = windowStatus ?? assignmentWindow(item);
  async function submit(questionId: number) {
    setBusyId(questionId);
    try {
      await api.post<AssignmentSubmission>(`/assignments/${item.id}/questions/${questionId}/submissions`, {
        selected_option_ids: answers[questionId] ? [answers[questionId]] : [],
      }, { headers: { "Idempotency-Key": crypto.randomUUID() } });
      await client.invalidateQueries({ queryKey: queryKeys.assignments.submissions(item.id) });
      toast.success("Đã nộp câu trả lời.");
    } catch (error) { toast.error(errorText(error)); }
    finally { setBusyId(null); }
  }
  return <div className="space-y-4">
    <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">Bài tập cho phép nộp từng câu. Câu chưa trả lời được tính 0 điểm.</p>
    {details.questions.map((question, index) => {
      const attempts = history.data?.filter((row) => row.question_id === question.question_id) ?? [];
      const locked = item.max_attempts != null && attempts.length >= item.max_attempts;
      return <fieldset id={`question-${question.question_id}`} data-question-id={question.question_id} key={question.question_id} className="scroll-mt-24 space-y-3 rounded-xl border bg-card p-5 shadow-sm sm:p-6">
        <legend className="px-1 text-sm font-semibold">Câu {index + 1} · {question.points} điểm</legend>
        <AssignmentQuestionClassification question={question} />
        <p className="whitespace-pre-wrap text-sm">{question.content}</p>
        {question.type === "mcq" ? <>
          <div className="space-y-2">{question.options.map((option) => <label key={option.id} className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm hover:bg-muted/50"><input type="radio" name={`assignment-${question.question_id}`} checked={answers[question.question_id] === option.id} disabled={locked || busyId === question.question_id} onChange={() => setAnswers((current) => ({ ...current, [question.question_id]: option.id }))} /><span>{option.content}</span></label>)}</div>
          <Button size="sm" disabled={history.isPending || locked || window === "closed" || busyId === question.question_id} onClick={() => submit(question.question_id)}>{busyId === question.question_id ? "Đang nộp…" : locked ? "Đã hết lượt nộp" : "Nộp câu này"}</Button>
        </> : <AssignmentCodePanel assignment={item} question={question} attempts={attempts}
          locked={locked || history.isPending || history.isError} window={window} />}
        <AssignmentSubmissionHistory attempts={attempts} />
      </fieldset>;
    })}
    {history.isError ? <p className="text-sm text-destructive">Không tải được lịch sử nộp bài.</p> : null}
    {window === "late" ? <p className="text-sm text-amber-700">Nộp muộn sẽ bị trừ {item.late_penalty_percent}% điểm.</p> : null}
    {window === "closed" ? <p className="text-sm text-destructive">Đã hết thời gian nhận bài.</p> : null}
  </div>;
}
