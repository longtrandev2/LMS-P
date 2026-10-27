import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { AttemptSessionSummary, AttemptSessionView } from "@/types/exams";
import { QuizQuestionView } from "@/features/assignments/student/quiz/quiz-question-view";
import { useArrowNavigation, useLeaveWarning } from "@/features/assignments/student/quiz/use-page-guards";
import { FinishDialog } from "./finish-dialog";
import { FocusWarning } from "./focus-warning";
import { restoreRoom } from "./local-backup";
import { RoomProgrammingQuestion } from "./programming-question";
import { QuestionNav } from "./question-nav";
import { buildSections, questionAnswered } from "./room-model";
import { RoomTopBar } from "./room-top-bar";
import { useAutosave } from "./use-autosave";
import { useFinish } from "./use-finish";
import { useRoomAnswers } from "./use-room-answers";
import { useSessionClock } from "./use-session-clock";
import { useSessionEvents } from "./use-session-events";

/**
 * Phòng thi (exam-spec §8.1): thanh trên cố định, cột trái lưới câu theo phần, nội dung một câu mỗi trang.
 * Tự lưu + bản sao trên máy, heartbeat/sự kiện rời trang, hết giờ tự nộp.
 */
export function ExamRoom({ view, onSubmitted, onTimedOut }: {
  view: AttemptSessionView; onSubmitted: (summary: AttemptSessionSummary) => void; onTimedOut: () => void;
}) {
  const sessionId = view.session.id;
  const { sections, list } = useMemo(() => buildSections(view), [view]);
  const [restored] = useState(() => restoreRoom(view));
  const [finishOpen, setFinishOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const clock = useSessionClock(view.session, () => void finisher.finish(true));
  const autosave = useAutosave({
    sessionId, initialPending: restored.pending, serverNow: clock.serverNow, onClock: clock.sync,
    onEnded: () => void finisher.finish(true),
  });
  const events = useSessionEvents({ sessionId, onClock: clock.sync, onEnded: () => void finisher.finish(true) });
  const finisher = useFinish({ sessionId, drain: autosave.drain, resume: autosave.resume, onSubmitted, onTimedOut });
  const room = useRoomAnswers(sessionId, restored, autosave.queue);

  const total = list.length;
  const index = Math.min(Math.max(room.current, 0), Math.max(total - 1, 0));
  const item = list[index];
  const goTo = (next: number) => { room.setCurrent(Math.min(Math.max(next, 0), total - 1)); setNavOpen(false); };
  const answered = new Set(list.filter(({ question }) => questionAnswered(question, room.answers, room.codes)).map(({ question }) => question.question_id));
  const unanswered = list.filter(({ question }) => !answered.has(question.question_id)).map(({ index: at }) => at);
  const flaggedIndexes = list.filter(({ question }) => room.flagged.includes(question.question_id)).map(({ index: at }) => at);

  useLeaveWarning(true);
  useArrowNavigation(() => goTo(index - 1), () => goTo(index + 1));

  function openFinish() {
    finisher.reset();
    setFinishOpen(true);
  }

  const nav = <QuestionNav sections={sections} answered={answered} flagged={room.flagged} current={index} onSelect={goTo} />;
  const question = item?.question;

  return <div className="flex h-dvh flex-col bg-background">
    <RoomTopBar title={view.title} paperCode={view.session.paper_code} attemptNo={view.session.attempt_no} seconds={clock.remaining}
      status={autosave.status} dirty={autosave.dirty} onSubmit={openFinish} submitting={finisher.pending} onOpenNav={() => setNavOpen(true)} />
    {events.warning != null ? <FocusWarning count={events.warning} onDismiss={events.dismissWarning} /> : null}
    <div className="flex min-h-0 flex-1">
      <aside aria-label="Câu hỏi" className="hidden w-64 shrink-0 overflow-y-auto border-r bg-sidebar lg:block">{nav}</aside>
      <main className="min-w-0 flex-1 overflow-y-auto">
        {!question ? <p className="p-8 text-sm text-muted-foreground">Đề không có câu hỏi nào.</p>
          : question.type === "programming"
            ? <RoomProgrammingQuestion key={question.question_id} sessionId={sessionId} question={question} index={index} total={total}
                code={room.codes[question.question_id]} onCodeChange={(code) => room.setCode(question, code)}
                onLanguageChange={(language) => room.setLanguage(question, language, room.codes[question.question_id])}
                flagged={room.flagged.includes(question.question_id)} onToggleFlag={() => room.toggleFlag(question.question_id)}
                onPrev={() => goTo(index - 1)} onNext={() => goTo(index + 1)} />
            : <div className="px-4 py-6 sm:px-8 sm:py-8">
              <div className="mx-auto w-full max-w-[720px]">
                {sections.length > 1 && sections[item.section]?.label ? <p className="mb-3 text-sm font-medium text-muted-foreground">{sections[item.section].label}</p> : null}
                <QuizQuestionView question={question} index={index} total={total} value={room.answers[question.question_id] ?? {}}
                  onChange={(draft) => room.setAnswer(question, draft)} flagged={room.flagged.includes(question.question_id)}
                  onToggleFlag={() => room.toggleFlag(question.question_id)} onPrev={() => goTo(index - 1)} onNext={() => goTo(index + 1)}
                  onSubmit={openFinish} />
              </div>
            </div>}
      </main>
    </div>
    <Sheet open={navOpen} onOpenChange={setNavOpen}>
      <SheetContent side="left" className="w-72 overflow-y-auto p-0">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle>Câu hỏi</SheetTitle>
          <SheetDescription>Chọn câu để chuyển tới.</SheetDescription>
        </SheetHeader>
        {nav}
      </SheetContent>
    </Sheet>
    <FinishDialog open={finishOpen} onOpenChange={setFinishOpen} total={total} unanswered={unanswered} flagged={flaggedIndexes}
      onJump={(at) => { setFinishOpen(false); goTo(at); }} onConfirm={() => void finisher.finish(false)}
      pending={finisher.pending} error={finisher.error} />
  </div>;
}
