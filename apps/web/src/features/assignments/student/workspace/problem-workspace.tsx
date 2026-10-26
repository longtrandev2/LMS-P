import { useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ALL_LANGUAGES, DEFAULT_STARTERS } from "@/lib/languages";
import { useRunJob } from "@/lib/use-run-job";
import type { AssignmentQuestion, AssignmentSubmission, AssignmentSummary, ProgrammingLanguage } from "@/types/api";
import { acceptsSubmissions, assignmentWindow } from "../../submission-window";
import { countedAttempts } from "../../submission-result";
import { ConfirmDialog } from "../confirm-dialog";
import { remainingAttempts } from "../labels";
import { CodePane } from "./code-pane";
import { LatestSubmissionResult } from "./latest-submission-result";
import { ProblemStatement } from "./problem-statement";
import { RunControls } from "./run-controls";
import { RunResult, runErrorText } from "./run-result";
import { SubmissionHistory } from "./submission-history";
import { useCodeDraft } from "./use-code-draft";
import { useCodeSubmit, useLatestSubmission } from "./use-workspace-submission";

const MAX_SOURCE_BYTES = 128 * 1024;

/** Workspace lập trình: đề/bài nộp bên trái, editor + chạy thử + nộp + kết quả bên phải. */
export function ProblemWorkspace({ item, question, history, userId }: {
  item: AssignmentSummary; question: AssignmentQuestion; history: AssignmentSubmission[]; userId: number | null;
}) {
  const programming = question.programming;
  const allowed = programming?.allowed_languages?.length ? programming.allowed_languages : ALL_LANGUAGES;
  const starterFor = (language: ProgrammingLanguage) => programming?.starter_codes?.[language] ?? DEFAULT_STARTERS[language];
  const draft = useCodeDraft({ userId, assignmentId: item.id, questionId: question.question_id, allowed, starterFor });
  const [leftTab, setLeftTab] = useState("statement");
  const [panel, setPanel] = useState(history.length ? "submission" : "run");
  const [useCustom, setUseCustom] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [lastRunCustom, setLastRunCustom] = useState(false);
  const [runError, setRunError] = useState<unknown>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const run = useRunJob();
  const latest = useLatestSubmission(item.id, history);
  const submit = useCodeSubmit(item.id, question.question_id, (id) => { latest.setSubmittedId(id); setPanel("submission"); });

  const open = acceptsSubmissions(assignmentWindow(item));
  const used = countedAttempts(history);
  const remaining = remainingAttempts(used, item.max_attempts);
  const tooLarge = new Blob([draft.code]).size > MAX_SOURCE_BYTES;
  const empty = !draft.code.trim();
  const note = !open ? "Bài đã đóng" : remaining === 0 ? "Đã hết lượt nộp" : tooLarge ? "Code vượt 128 KiB"
    : remaining == null ? `Đã nộp ${used} lượt` : `Còn ${remaining}/${item.max_attempts} lượt nộp`;

  async function onRun() {
    setRunError(null);
    setPanel("run");
    setLastRunCustom(useCustom);
    run.reset();
    try {
      await run.start(`/assignments/${item.id}/questions/${question.question_id}/run`, {
        language: draft.language, source_code: draft.code, custom_input: useCustom ? customInput : undefined,
      });
    } catch (error) {
      setRunError(error);
      toast.error(runErrorText(error));
    }
  }

  const doSubmit = () => submit.mutate({ language: draft.language, source_code: draft.code });

  return <div className="grid gap-4 lg:h-[calc(100dvh-13rem)] lg:min-h-[36rem] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
    <section aria-label="Đề và bài nộp" className="flex min-h-0 flex-col rounded-xl border bg-card">
      <Tabs value={leftTab} onValueChange={setLeftTab} className="flex min-h-0 flex-1 flex-col gap-0">
        <div className="border-b px-3 pt-1.5">
          <TabsList variant="line">
            <TabsTrigger value="statement">Đề bài</TabsTrigger>
            <TabsTrigger value="submissions">Bài nộp ({history.length})</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="statement" className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5"><ProblemStatement question={question} /></TabsContent>
        <TabsContent value="submissions" className="min-h-0 flex-1 overflow-y-auto p-4"><SubmissionHistory rows={history} maxScore={question.points} /></TabsContent>
      </Tabs>
    </section>
    <section aria-label="Làm bài" className="flex min-h-0 flex-col gap-3 lg:overflow-y-auto lg:pr-1">
      <CodePane allowed={allowed} language={draft.language} onLanguageChange={draft.setLanguage} code={draft.code}
        onCodeChange={draft.setCode} onRestore={draft.restoreStarter} isStarter={draft.isStarter} readOnly={false} />
      <RunControls useCustom={useCustom} onUseCustomChange={setUseCustom} customInput={customInput} onCustomInputChange={setCustomInput}
        onRun={() => void onRun()} running={run.running} hasSamples={(programming?.samples.length ?? 0) > 0}
        canRun={open && !empty && !tooLarge && (useCustom || (programming?.samples.length ?? 0) > 0)}
        onSubmit={() => (remaining === 1 ? setConfirmOpen(true) : doSubmit())} submitting={submit.isPending}
        canSubmit={open && remaining !== 0 && !empty && !tooLarge} note={note} />
      <div className="rounded-xl border bg-card">
        <Tabs value={panel} onValueChange={setPanel} className="gap-0">
          <div className="border-b px-3 pt-1.5">
            <TabsList variant="line">
              <TabsTrigger value="run">Chạy thử</TabsTrigger>
              <TabsTrigger value="submission">Lần nộp gần nhất</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="run" className="p-4" aria-live="polite">
            <RunResult job={run.job} running={run.running} error={runError ?? run.error} custom={lastRunCustom} />
          </TabsContent>
          <TabsContent value="submission" className="p-4" aria-live="polite">
            <LatestSubmissionResult submission={latest.details.data} loading={latest.activeId != null && latest.details.isPending}
              error={latest.details.error} onRetry={() => void latest.details.refetch()} />
          </TabsContent>
        </Tabs>
      </div>
    </section>
    <ConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} title="Nộp lượt cuối?"
      description="Đây là lượt nộp cuối cùng của câu này. Hãy chạy thử với ví dụ mẫu trước khi nộp." confirmLabel="Nộp bài" onConfirm={doSubmit} />
  </div>;
}
