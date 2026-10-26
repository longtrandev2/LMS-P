import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import { queryKeys } from "@/lib/query-keys";
import type { Answer, AssignmentQuestion, AssignmentSubmission, AssignmentSummary } from "@/types/api";
import { acceptsSubmissions, assignmentWindow } from "../../submission-window";
import { countedAttempts, formatScore, sortLatestFirst } from "../../submission-result";
import { AnswerInput, QuestionPrompt } from "../answers/answer-input";
import { toAnswer, type DraftAnswer } from "../answers/answer-model";
import { ConfirmDialog } from "../confirm-dialog";
import { attemptsText, remainingAttempts } from "../labels";
import { draftKeys } from "../local-draft";
import { studentPaths } from "../paths";
import { useIdempotencyKey } from "../use-idempotency-key";
import { useLocalDraft } from "../use-local-draft";
import { QuestionCardHeader } from "./question-card-header";

const EMPTY: DraftAnswer = {};

/** Câu khách quan trong bài thường: trả lời ngay trên trang, nộp từng câu (chấm đồng bộ). */
export function ObjectiveQuestionCard({ item, question, index, submissions, userId }: {
  item: AssignmentSummary; question: AssignmentQuestion; index: number; submissions: AssignmentSubmission[]; userId: number | null;
}) {
  const client = useQueryClient();
  const idempotency = useIdempotencyKey();
  const draft = useLocalDraft<DraftAnswer>(userId != null ? draftKeys.answer(userId, item.id, question.question_id) : null, EMPTY);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const used = countedAttempts(submissions);
  const remaining = remainingAttempts(used, item.max_attempts);
  const latest = sortLatestFirst(submissions)[0];
  const locked = !acceptsSubmissions(assignmentWindow(item)) || remaining === 0;
  const answer = toAnswer(question, draft.value);

  const submit = useMutation({
    mutationFn: (body: Answer) => api.post<AssignmentSubmission>(
      `/assignments/${item.id}/questions/${question.question_id}/submissions`, body,
      { headers: { "Idempotency-Key": idempotency.keyFor(JSON.stringify(body)) } }),
    onSuccess: () => {
      idempotency.reset();
      toast.success(`Đã nộp câu ${index + 1}.`);
      void client.invalidateQueries({ queryKey: queryKeys.assignments.mySubmissions(item.id) });
    },
    onError: (error) => toast.error(errorText(error)),
  });

  function requestSubmit() {
    if (!answer) return;
    if (remaining != null && remaining <= 2) setConfirmOpen(true);
    else submit.mutate(answer);
  }

  const status = latest ? (latest.score != null ? `${formatScore(latest.score)}/${formatScore(question.points)} điểm` : "Đã nộp") : "Chưa nộp";
  return <article id={`question-${question.question_id}`} className="rounded-xl border bg-card" aria-labelledby={`q-${question.question_id}-title`}>
    <QuestionCardHeader index={index} question={question} titleId={`q-${question.question_id}-title`}
      status={<span className={latest ? "text-foreground" : "text-muted-foreground"}>{status}</span>} />
    <div className="space-y-4 p-4">
      <QuestionPrompt question={question} />
      <AnswerInput question={question} value={draft.value} onChange={draft.setValue} readOnly={locked} idPrefix={`q${question.question_id}`} />
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
      <p className="text-xs text-muted-foreground">
        {attemptsText(used, item.max_attempts)}
        {latest ? <> · <Link className="underline underline-offset-4 hover:text-foreground" to={studentPaths.submission(latest.id)}>Chi tiết lượt gần nhất</Link></> : null}
      </p>
      <Button size="sm" variant="cta" disabled={locked || !answer || submit.isPending} onClick={requestSubmit}>
        {submit.isPending ? "Đang nộp…" : remaining === 0 ? "Hết lượt" : "Nộp câu này"}
      </Button>
    </div>
    <ConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} title={`Nộp câu ${index + 1}?`}
      description={remaining === 1 ? "Đây là lượt cuối cùng của câu này. Sau khi nộp bạn không thể sửa câu trả lời."
        : `Bạn còn ${remaining ?? 0} lượt cho câu này. Mỗi lần nộp tính một lượt.`}
      confirmLabel="Nộp câu này" onConfirm={() => { if (answer) submit.mutate(answer); }} />
  </article>;
}
