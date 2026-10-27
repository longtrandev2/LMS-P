import { useState } from "react";
import { Loader2, ShieldCheck, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { VerdictBadge } from "@/components/verdict-badge";
import { cn } from "@/lib/utils";
import { EditorSection, useEditor } from "../editor-context";
import { OutputConflictDialog } from "./output-conflict-dialog";
import { RunResultsTable } from "./run-results-table";
import { useSolutionRuns, type RunSummary } from "./use-solution-runs";

function SummaryLine({ summary }: { summary: RunSummary }) {
  const { job, rows, mode } = summary;
  const passed = rows.filter((row) => row.verdict === "AC" || row.verdict === "OK").length;
  if (job.status === "failed") return <p className="text-sm text-destructive">Chạy không thành công: {job.error_message || "lỗi hệ thống chấm"}. Thử lại sau.</p>;
  if (job.verdict === "CE") return <div className="space-y-2">
    <div className="flex items-center gap-2"><VerdictBadge verdict="CE" /><span className="text-sm">Lời giải không biên dịch được.</span></div>
    {job.compile_output ? <pre className="max-h-56 overflow-auto rounded-md bg-secondary px-3 py-2.5 font-mono text-xs whitespace-pre-wrap">{job.compile_output}</pre> : null}
  </div>;
  const allPass = passed === rows.length && rows.length > 0;
  return <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
    <p className={cn("text-sm font-medium", allPass ? "text-success" : "text-destructive")}>
      {mode === "verify" ? `Lời giải đạt ${passed}/${rows.length} test.` : `Đã chạy ${rows.length} test · điền output cho ${summary.filled} test${summary.failed ? ` · ${summary.failed} test lỗi khi chạy` : ""}.`}
    </p>
    {mode === "verify" && allPass ? <p className="text-sm text-muted-foreground">Câu hỏi sẵn sàng để xuất bản.</p> : null}
  </div>;
}

/** Section “Kiểm tra đề”: sinh output (draft_check) và kiểm tra đề (problem_check) — §7; kết quả dạng danh sách test. */
export function SolutionRunsPanel({ suggestVerify }: { suggestVerify: boolean }) {
  const { draft, questionId, dirty } = useEditor();
  const runs = useSolutionRuns();
  const [dismissed, setDismissed] = useState(false);
  const hasSolution = !!draft.programming.solution_code.trim();
  const verifyBlocker = questionId == null ? "Lưu câu hỏi trước khi kiểm tra đề."
    : dirty ? "Có thay đổi chưa lưu — kiểm tra đề chạy trên phiên bản đã lưu." : !hasSolution ? "Cần có lời giải mẫu." : null;
  const verifyNow = () => { setDismissed(true); runs.verify(draft.tests); };

  return <EditorSection title="Kiểm tra đề" description="Chạy lời giải mẫu trên bộ test. Bài có câu lập trình chỉ xuất bản được khi kiểm tra đề đạt mọi test."
    actions={<>
      <Button type="button" variant="outline" disabled={runs.running || !hasSolution} onClick={() => {
        const problem = runs.generate(); if (problem) toast.error(problem);
      }}><Wand2 aria-hidden /> Sinh output từ lời giải</Button>
      <Button type="button" variant="outline" disabled={runs.running || !!verifyBlocker} onClick={verifyNow}>
        <ShieldCheck aria-hidden /> Kiểm tra đề</Button>
    </>}>
    {runs.running ? <p role="status" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" aria-hidden />{runs.mode === "verify" ? "Đang kiểm tra đề…" : "Đang chạy lời giải…"}</p>
      : !runs.summary && verifyBlocker ? <p className="text-sm text-muted-foreground">{verifyBlocker}</p> : null}
    {suggestVerify && !dismissed && !verifyBlocker && !runs.summary && !runs.running ? <div role="status"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-info/8 px-4 py-3 text-sm text-info">
      <span>Đã lưu phiên bản mới. Chạy kiểm tra đề để có thể xuất bản bài chứa câu này.</span>
      <Button type="button" size="sm" variant="outline" onClick={verifyNow}>Kiểm tra ngay</Button>
    </div> : null}
    {runs.summary ? <div className="space-y-3" aria-live="polite">
      <SummaryLine summary={runs.summary} />
      {runs.summary.rows.length && runs.summary.job.verdict !== "CE" ? <RunResultsTable rows={runs.summary.rows} /> : null}
    </div> : null}
    {runs.conflicts.length ? <OutputConflictDialog conflicts={runs.conflicts} onOverwrite={runs.overwrite} onKeep={runs.dismissConflicts} /> : null}
  </EditorSection>;
}
