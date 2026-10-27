import { useState } from "react";
import { useParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { CodeEditor } from "@/components/code-editor";
import { ErrorState } from "@/components/state-blocks";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { hasRole } from "@/stores/auth";
import { GradingHistory } from "@/features/assignments/submission/grading-history";
import { MonoBlock } from "@/features/assignments/submission/mono-block";
import { ObjectiveResponse } from "@/features/assignments/submission/objective-response";
import { RegradeButton } from "@/features/assignments/submission/regrade-dialog";
import { SubmissionHeader } from "@/features/assignments/submission/submission-header";
import { TestResultsList } from "@/features/assignments/submission/test-results-list";
import { useSubmissionLive } from "@/features/assignments/submission/use-submission-live";
import { BackLink } from "@/features/assignments/student/page-states";

const EDITOR_LANGUAGES = ["python", "c", "cpp", "java"] as const;

/** Khối nội dung không khung: tiêu đề 14/600 + nội dung (DESIGN.md §4 "Chi tiết bài nộp"). */
function Block({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return <section aria-label={title} className="space-y-3">
    <header className="flex flex-wrap items-center justify-between gap-2">
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

  return <div className="space-y-8">
    {back ? <BackLink to={back.to}>{back.label}</BackLink> : <span className="block h-5" />}
    {submission.isError ? <ErrorState error={submission.error} onRetry={() => submission.refetch()} /> : null}
    {submission.isPending ? <div aria-busy="true" aria-label="Đang tải" className="space-y-4"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-8 w-1/3" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-72 rounded-lg" /></div> : null}
    {data ? <>
      <SubmissionHeader submission={data} result={shown} question={question} position={position} assignmentTitle={details?.assignment.title}
        showScore={staff || code || data.review_available === true}
        action={staff && code ? <RegradeButton submissionId={data.id} assignmentId={data.assignment_id} disabled={!canRegrade} /> : undefined} />
      {grading ? <p role="status" className="rounded-lg bg-info/8 px-4 py-3 text-sm text-info">
        {data.status === "pending" ? "Bài đang chờ chấm." : "Đang chấm bài."} Trang tự cập nhật khi có kết quả.
      </p> : null}

      {code ? <Block title="Mã nguồn" aside={<span className="text-xs text-muted-foreground">Chỉ đọc</span>}>
        <CodeEditor value={data.source_code ?? ""} language={language} readOnly maxHeight="32rem" minHeight="8rem" ariaLabel="Mã nguồn đã nộp" />
      </Block> : null}
      {shown?.compile_output || shown?.error_message ? <Block title="Log">
        {shown.compile_output ? <MonoBlock title={shown.compile_error ? "Log biên dịch (lỗi)" : "Log biên dịch"} value={shown.compile_output} tone={shown.compile_error ? "danger" : "default"} maxHeight="max-h-80" /> : null}
        {shown.error_message ? <MonoBlock title="Lỗi hệ thống chấm" value={shown.error_message} tone="danger" /> : null}
      </Block> : null}
      {code ? <Block title="Kết quả test" aside={shown && data.result && shown.grading_attempt !== data.result.grading_attempt
        ? <span className="text-xs text-warning">Đang xem lần chấm {shown.grading_attempt} (cũ)</span> : null}>
        {shown ? <TestResultsList key={shown.grading_attempt} result={shown} />
          : <p className="text-sm text-muted-foreground">{grading ? "Đang chờ kết quả chấm…" : "Chưa có kết quả chấm."}</p>}
      </Block> : null}
      {code && history.length > 1 ? <Block title={`Lịch sử chấm · ${history.length} lần`}>
        <GradingHistory results={history} selected={shown?.grading_attempt ?? null} onSelect={setSelected} />
      </Block> : null}

      {!code && data.response && (staff || data.review_available) ? <Block title="Bài làm"><ObjectiveResponse question={question} response={data.response} /></Block> : null}
      {!code && !staff && !data.review_available ? <p className="text-sm text-muted-foreground">
        Đã nộp. Điểm và câu trả lời hiện khi bài cho phép xem lại.
      </p> : null}
    </> : null}
  </div>;
}
