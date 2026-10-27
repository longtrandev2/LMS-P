import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { Answer, AssignmentDetails } from "@/types/api";
import { assignmentWindow } from "../../submission-window";
import { toAnswer } from "../answers/answer-model";
import { studentPaths } from "../paths";
import { useArrowNavigation, useLeaveWarning } from "./use-page-guards";
import { QuizHeader } from "./quiz-header";
import { QuizNavigator } from "./quiz-navigator";
import { QuizQuestionView } from "./quiz-question-view";
import { QuizSubmitDialog } from "./quiz-submit-dialog";
import { useQuizDraft } from "./use-quiz-draft";
import { useQuizSubmit } from "./use-quiz-submit";

/** Phiên làm một lượt quiz (một câu mỗi lần, nháp tự lưu, xác nhận nộp). */
export function QuizRunner({ details, attemptNo, draftKey, remainingAfter }: {
  details: AssignmentDetails; attemptNo: number; draftKey: string; remainingAfter: number | null;
}) {
  const navigate = useNavigate();
  const item = details.assignment;
  const questions = details.questions;
  const draft = useQuizDraft(draftKey, questions);
  const [submitOpen, setSubmitOpen] = useState(false);
  const submit = useQuizSubmit(item.id, (attempt) => {
    draft.finish();
    toast.success("Đã nộp bài và chấm điểm.");
    navigate(studentPaths.review(item.class_id, item.id, attempt.attempt_id), { replace: true });
  });
  const index = Math.min(Math.max(draft.current, 0), questions.length - 1);
  const question = questions[index];
  const late = assignmentWindow(item) === "late";
  const goTo = (next: number) => draft.setCurrent(Math.min(Math.max(next, 0), questions.length - 1));

  useEffect(() => {
    // `restored` cố định trong suốt phiên; id toast chống trùng khi StrictMode chạy effect hai lần.
    if (draft.restored) toast.info("Đã khôi phục bài làm đang dở.", { id: `quiz-restored-${draftKey}` });
  }, [draft.restored, draftKey]);
  useLeaveWarning(draft.dirty && !submit.isSuccess);
  useArrowNavigation(() => goTo(index - 1), () => goTo(index + 1));

  function confirmSubmit() {
    const answers = questions.map((row) => toAnswer(row, draft.answers[row.question_id])).filter((row): row is Answer => row != null);
    submit.mutate(answers);
  }

  function openSubmit() {
    submit.reset();
    setSubmitOpen(true);
  }

  const note = remainingAfter == null ? "Không giới hạn số lượt làm." : remainingAfter === 0 ? "Đây là lượt cuối cùng của bạn."
    : `Sau lượt này bạn còn ${remainingAfter} lượt.`;

  // `data-layout="full"`: AppShell bỏ padding — cột phải dính sát mép như mục lục khóa học của Frappe.
  return <div data-layout="full" className="lg:grid lg:min-h-[calc(100dvh-3rem)] lg:grid-cols-[minmax(0,1fr)_20rem]">
    <div className="min-w-0 px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto w-full max-w-[720px] space-y-6">
        <QuizHeader item={item} attemptNo={attemptNo} backTo={studentPaths.overview(item.class_id, item.id)} late={late} />
        <QuizQuestionView question={question} index={index} total={questions.length}
          value={draft.answers[question.question_id] ?? {}} onChange={(value) => draft.setAnswer(question.question_id, value)}
          flagged={draft.flagged.includes(question.question_id)} onToggleFlag={() => draft.toggleFlag(question.question_id)}
          onPrev={() => goTo(index - 1)} onNext={() => goTo(index + 1)} onSubmit={openSubmit} />
      </div>
    </div>
    <aside aria-label="Tiến độ và nộp bài" className="border-t bg-background lg:sticky lg:top-12 lg:h-[calc(100dvh-3rem)] lg:border-t-0 lg:border-l">
      <QuizNavigator title={item.title} questions={questions} answers={draft.answers} flagged={draft.flagged} current={index}
        onSelect={goTo} answered={draft.answeredCount} onSubmit={openSubmit} submitting={submit.isPending} note={note} />
    </aside>
    <QuizSubmitDialog open={submitOpen} onOpenChange={setSubmitOpen} questions={questions} answers={draft.answers}
      flagged={draft.flagged} onJump={(next) => { setSubmitOpen(false); goTo(next); }} onConfirm={confirmSubmit}
      pending={submit.isPending} error={submit.error} latePenalty={late ? item.late_penalty_percent : null} remainingAfter={remainingAfter} />
  </div>;
}
