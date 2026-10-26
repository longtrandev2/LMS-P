import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { assignmentWindow } from "@/features/assignments/submission-window";
import type { AssignmentQuestion, AssignmentSummary, AssignmentSubmission, GradingVerdict, SubmissionDetails } from "@/types/api";

const verdictText: Record<GradingVerdict, string> = {
  AC: "AC · Đạt tất cả test", WA: "WA · Sai kết quả", CE: "CE · Lỗi biên dịch",
  TLE: "TLE · Quá thời gian", MLE: "MLE · Vượt bộ nhớ", RE: "RE · Lỗi khi chạy",
  OLE: "OLE · Output quá dài", OK: "Chạy xong", SYSTEM_ERROR: "Lỗi hệ thống chấm",
};

export function AssignmentCodePanel({ assignment, question, attempts, locked, window }: {
  assignment: AssignmentSummary; question: AssignmentQuestion; attempts: AssignmentSubmission[]; locked: boolean;
  window: ReturnType<typeof assignmentWindow>;
}) {
  const client = useQueryClient();
  const [source, setSource] = useState(question.starter_code ?? "");
  const [language, setLanguage] = useState(question.allowed_languages?.[0] ?? "python");
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const latest = attempts.reduce<AssignmentSubmission | undefined>((current, item) =>
    item.type === "code" && (!current || item.attempt_no > current.attempt_no) ? item : current, undefined);
  const activeId = selectedId ?? latest?.id;
  const unavailable = window === "upcoming" || window === "closed";

  const result = useQuery({
    queryKey: ["submission", activeId],
    queryFn: () => api.get<SubmissionDetails>(`/submissions/${activeId}`),
    enabled: activeId != null,
    refetchInterval: (query) => ["pending", "grading"].includes(query.state.data?.status ?? "") ? 2000 : false,
  });

  async function submit() {
    setBusy(true);
    try {
      const receipt = await api.post<{ submission_id: number }>(
        `/assignments/${assignment.id}/questions/${question.question_id}/submissions`,
        { language, source_code: source }, { headers: { "Idempotency-Key": crypto.randomUUID() } });
      setSelectedId(receipt.submission_id);
      await client.invalidateQueries({ queryKey: queryKeys.assignments.submissions(assignment.id) });
      toast.success("Đã nhận code, đang chờ chấm.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Không thể nộp code."); }
    finally { setBusy(false); }
  }

  const allowed = question.allowed_languages?.length ? question.allowed_languages : ["python", "c", "cpp", "java"];
  const grading = result.data?.status === "pending" || result.data?.status === "grading";
  return <section className="space-y-3 rounded-lg bg-muted/30 p-3">
    <div className="space-y-2">
      <Label htmlFor={`language-${question.question_id}`}>Ngôn ngữ</Label>
      <select id={`language-${question.question_id}`} value={language} onChange={(event) => setLanguage(event.target.value)}
        disabled={busy || locked || unavailable} className="h-9 rounded-md border bg-background px-3 text-sm">
        {allowed.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
    </div>
    <div className="space-y-2">
      <Label htmlFor={`code-${question.question_id}`}>Mã nguồn</Label>
      <Textarea id={`code-${question.question_id}`} value={source} onChange={(event) => setSource(event.target.value)}
        spellCheck={false} autoCapitalize="off" rows={16} disabled={busy || locked || unavailable}
        className="min-h-72 resize-y font-mono text-xs leading-5" placeholder="Viết code của bạn ở đây" />
    </div>
    {question.test_cases.length ? <details className="rounded-md border p-3 text-xs">
      <summary className="cursor-pointer font-medium">Test công khai ({question.test_cases.length})</summary>
      <div className="mt-3 space-y-3">{question.test_cases.map((test, index) => <div key={test.position}>
        <p className="font-medium">Test {index + 1}</p><pre className="mt-1 whitespace-pre-wrap">Input: {test.input}{"\n"}Output mong đợi: {test.expected_output}</pre>
      </div>)}</div>
    </details> : null}
    <Button onClick={submit} disabled={busy || locked || unavailable || !source.trim()}>{busy ? "Đang nộp…" : locked ? "Đã hết lượt nộp" : "Nộp code"}</Button>
    {grading ? <p role="status" className="text-sm text-muted-foreground">{result.data?.status === "pending" ? "Đang chờ worker…" : "Worker đang chấm…"}</p> : null}
    {result.data?.result ? <div className="rounded-md border bg-background p-3 text-sm" role="status">
      <p className={result.data.result.verdict === "AC" ? "font-semibold text-emerald-700" : "font-semibold"}>
        {result.data.result.verdict ? verdictText[result.data.result.verdict] : "Chấm lỗi"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">Thời gian chấm: {result.data.result.duration_ms} ms</p>
      {result.data.result.compile_output ? <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-muted p-2 text-xs">{result.data.result.compile_output}</pre> : null}
      {result.data.result.error_message ? <p className="mt-2 text-destructive">{result.data.result.error_message}</p> : null}
    </div> : null}
    {result.isError ? <p className="text-sm text-destructive">Không tải được kết quả bài nộp.</p> : null}
    {window === "upcoming" ? <p className="text-xs text-muted-foreground">Bài chưa đến thời gian mở.</p> : null}
    {window === "closed" ? <p className="text-xs text-destructive">Đã hết thời gian nhận bài.</p> : null}
  </section>;
}
