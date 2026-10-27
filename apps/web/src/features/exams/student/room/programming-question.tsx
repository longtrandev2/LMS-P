import { useState } from "react";
import { Award, Cpu, Timer } from "lucide-react";
import { toast } from "sonner";
import { useRunJob } from "@/lib/use-run-job";
import type { AssignmentQuestion, ProgrammingLanguage } from "@/types/api";
import { formatScore } from "@/features/assignments/submission-result";
import { MetaRow } from "@/features/assignments/student/meta-row";
import { problemTitle } from "@/features/assignments/student/overview/programming-question-card";
import { CodePane } from "@/features/assignments/student/workspace/code-pane";
import { ProblemStatement } from "@/features/assignments/student/workspace/problem-statement";
import { RunControls } from "@/features/assignments/student/workspace/run-controls";
import { RunResult, runErrorText } from "@/features/assignments/student/workspace/run-result";
import { allowedLanguages, starterFor, type CodeAnswer } from "./room-model";
import { QuestionStepper } from "./question-stepper";

const MAX_SOURCE_BYTES = 128 * 1024;

/**
 * Câu lập trình trong phòng thi: đề bên trái, editor + "Chạy thử" với ví dụ mẫu (`…/attempt-sessions/{id}/questions/{qid}/run`)
 * + kết quả chạy thử bên phải. Không có nút nộp riêng — code được tự lưu và chấm khi nộp cả bài.
 */
export function RoomProgrammingQuestion({ sessionId, question, index, total, code, onCodeChange, onLanguageChange, flagged, onToggleFlag, onPrev, onNext }: {
  sessionId: number; question: AssignmentQuestion; index: number; total: number; code: CodeAnswer | undefined;
  onCodeChange: (code: CodeAnswer) => void; onLanguageChange: (language: ProgrammingLanguage) => void;
  flagged: boolean; onToggleFlag: () => void; onPrev: () => void; onNext: () => void;
}) {
  const allowed = allowedLanguages(question);
  const language = code && allowed.includes(code.language) ? code.language : allowed[0];
  const source = code?.source_code ?? starterFor(question, language);
  const programming = question.programming;
  const samples = programming?.samples.length ?? 0;
  const run = useRunJob();
  const [useCustom, setUseCustom] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [lastRunCustom, setLastRunCustom] = useState(false);
  const [runError, setRunError] = useState<unknown>(null);
  const tooLarge = new Blob([source]).size > MAX_SOURCE_BYTES;

  async function onRun() {
    setRunError(null);
    setLastRunCustom(useCustom);
    run.reset();
    try {
      await run.start(`/attempt-sessions/${sessionId}/questions/${question.question_id}/run`, {
        language, source_code: source, custom_input: useCustom ? customInput : undefined,
      });
    } catch (error) {
      setRunError(error);
      toast.error(runErrorText(error));
    }
  }

  return <div className="grid lg:h-full lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
    <section aria-labelledby={`room-q-${question.question_id}`} className="min-h-0 border-b px-5 py-5 sm:px-6 lg:overflow-y-auto lg:border-r lg:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 space-y-1.5">
          <h2 id={`room-q-${question.question_id}`} className="text-sm text-muted-foreground">
            Câu {index + 1}<span aria-hidden className="mx-1.5">·</span>Lập trình
          </h2>
          <p className="text-base leading-snug font-semibold text-balance">{problemTitle(question.content) || "Bài lập trình"}</p>
          <MetaRow className="text-[13px]" items={[
            { icon: Award, text: `${formatScore(question.points)} điểm` },
            programming ? { icon: Timer, text: `${programming.time_limit_ms} ms` } : null,
            programming ? { icon: Cpu, text: `${programming.memory_limit_mb} MB` } : null,
          ]} />
        </div>
        <QuestionStepper index={index} total={total} flagged={flagged} onToggleFlag={onToggleFlag} onPrev={onPrev} onNext={onNext} />
      </div>
      <div className="mt-5"><ProblemStatement question={question} /></div>
    </section>
    <section aria-label="Soạn và chạy thử code" className="flex min-h-0 flex-col lg:overflow-y-auto">
      <CodePane allowed={allowed} language={language} onLanguageChange={onLanguageChange} code={source}
        onCodeChange={(value) => onCodeChange({ language, source_code: value })}
        onRestore={() => onCodeChange({ language, source_code: starterFor(question, language) })}
        isStarter={source === starterFor(question, language)} readOnly={false}
        savedNote={tooLarge ? "Code vượt 128 KiB — không lưu được" : "Tự lưu cùng bài làm"} minHeight="max(16rem, calc(100dvh - 26rem))" />
      <RunControls useCustom={useCustom} onUseCustomChange={setUseCustom} customInput={customInput} onCustomInputChange={setCustomInput}
        onRun={() => void onRun()} running={run.running} hasSamples={samples > 0}
        canRun={Boolean(source.trim()) && !tooLarge && (useCustom || samples > 0)} note="Chạy thử không tính điểm" />
      <div className="border-t px-4 py-3" aria-live="polite">
        <p className="mb-1 text-sm font-medium">Kết quả chạy thử</p>
        <RunResult job={run.job} running={run.running} error={runError ?? run.error} custom={lastRunCustom} />
      </div>
    </section>
  </div>;
}
