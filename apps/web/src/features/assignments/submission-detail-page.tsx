import { useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { CodeEditor } from "@/components/code-editor";
import { PageHeader } from "@/components/page-header";
import { ErrorState } from "@/components/state-blocks";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { hasRole } from "@/stores/auth";
import { GradingHistory } from "@/features/assignments/submission/grading-history";
import { MonoBlock } from "@/features/assignments/submission/mono-block";
import { ObjectiveResponse } from "@/features/assignments/submission/objective-response";
import { RegradeButton } from "@/features/assignments/submission/regrade-dialog";
import { SubmissionSummaryCard } from "@/features/assignments/submission/submission-summary-card";
import { TestResultsTable } from "@/features/assignments/submission/test-results-table";
import { useSubmissionLive } from "@/features/assignments/submission/use-submission-live";
import { BackLink } from "@/features/assignments/student/page-states";

const EDITOR_LANGUAGES = ["python", "c", "cpp", "java"] as const;

function Panel({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return <section aria-label={title} className="overflow-hidden rounded-xl border bg-card">
    <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 sm:px-5">
      <h2 className="text-sm font-semibold">{title}</h2>{aside}
    </header>
    {children}
  </section>;
}

/** `/submissions/:submissionId` — chi tiết bài nộp cho chủ bài và giảng viên (docs/assessment-spec.md §5, §8). */
export function SubmissionDetailPage() {
  const { submissionId = "" } = useParams();
  const id = Number(submissionId);
  const { status, user } = useAuthGuard();
  const staff = hasRole(user, "lecturer") || hasRole(user, "admin");
  const { submission, assignment, grading } = useSubmissionLive(id, status === "ok");
  const [selected, setSelected] = useState<number | null>(null);
  if (status !== "ok") return null;

  const data = submission.data;
  const details = assignment.data;
  const classId = details?.assignment.class_id;
  const questions = [...(details?.questions ?? [])].sort((a, b) => a.position - b.position);
  const question = questions.find((q) => q.question_id === data?.question_id);
  const position = question ? questions.indexOf(question) + 1 : undefined;
  const back = !data || classId == null ? null : staff
    ? { to: `/classes/${classId}/assignments/${data.assignment_id}/results`, label: "Kết quả bài" }
    : data.type === "code"
      ? { to: `/me/classes/${classId}/assignments/${data.assignment_id}/problems/${data.question_id}`, label: "Về câu lập trình" }
      : { to: `/me/classes/${classId}/assignments/${data.assignment_id}`, label: "Về bài" };
  const history = data?.results ?? (data?.result ? [data.result] : []);
  const shown = history.find((r) => r.grading_attempt === selected) ?? data?.result ?? history[0] ?? null;
  const code = data?.type === "code";
  const language = EDITOR_LANGUAGES.find((item) => item === data?.language) ?? "text";
  const canRegrade = staff && code && (data?.status === "completed" || data?.status === "failed");

  return <div className="space-y-6">
    {back ? <BackLink to={back.to}>{back.label}{details ? ` · ${details.assignment.title}` : ""}</BackLink> : <span className="block h-5" />}
    {submission.isError ? <ErrorState error={submission.error} onRetry={() => submission.refetch()} /> : null}
    {submission.isPending ? <div aria-busy="true" aria-label="Đang tải" className="space-y-4"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-36 rounded-xl" /><Skeleton className="h-72 rounded-xl" /></div> : null}
    {data ? <>
      <PageHeader title={`Bài nộp #${data.id}`} description={details ? `${details.assignment.title}${position ? ` · Câu ${position}` : ""} · Lượt ${data.attempt_no}` : undefined}
        actions={staff && code ? <RegradeButton submissionId={data.id} assignmentId={data.assignment_id} disabled={!canRegrade} /> : undefined} />
      {grading ? <Alert role="status">
        <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden />
        <AlertDescription className="text-foreground">{data.status === "pending" ? "Bài đang chờ chấm." : "Đang chấm bài."} Trang tự cập nhật khi có kết quả.</AlertDescription>
      </Alert> : null}
      <SubmissionSummaryCard submission={data} result={shown} question={question} position={position}
        showScore={staff || code || data.review_available === true} />

      {code ? <Panel title="Mã nguồn">
        <CodeEditor value={data.source_code ?? ""} language={language} readOnly maxHeight="32rem" minHeight="8rem" className="rounded-none border-0" ariaLabel="Mã nguồn đã nộp" />
      </Panel> : null}
      {shown?.compile_output || shown?.error_message ? <div className="grid gap-3 lg:grid-cols-2">
        {shown.compile_output ? <MonoBlock title={shown.compile_error ? "Log biên dịch (lỗi)" : "Log biên dịch"} value={shown.compile_output} tone={shown.compile_error ? "danger" : "default"} maxHeight="max-h-80" className="lg:col-span-2" /> : null}
        {shown.error_message ? <MonoBlock title="Lỗi hệ thống chấm" value={shown.error_message} tone="danger" className="lg:col-span-2" /> : null}
      </div> : null}
      {code ? <Panel title="Kết quả test" aside={shown && data.result && shown.grading_attempt !== data.result.grading_attempt
        ? <span className="text-xs text-muted-foreground">Đang xem lần chấm {shown.grading_attempt} (cũ)</span> : null}>
        {shown ? <TestResultsTable key={shown.grading_attempt} result={shown} />
          : <p className="px-5 py-6 text-sm text-muted-foreground">{grading ? "Đang chờ kết quả chấm…" : "Chưa có kết quả chấm."}</p>}
      </Panel> : null}
      {code && history.length > 1 ? <Panel title={`Lịch sử chấm (${history.length})`}>
        <GradingHistory results={history} selected={shown?.grading_attempt ?? null} onSelect={setSelected} />
      </Panel> : null}

      {!code && data.response && (staff || data.review_available) ? <Panel title="Câu trả lời"><ObjectiveResponse question={question} response={data.response} /></Panel> : null}
      {!code && !staff && !data.review_available ? <p className="rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
        Đã nộp. Điểm và câu trả lời hiện khi bài cho phép xem lại.
      </p> : null}
    </> : null}
  </div>;
}
