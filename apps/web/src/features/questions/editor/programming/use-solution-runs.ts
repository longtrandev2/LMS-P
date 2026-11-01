import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { errorText } from "@/lib/error-messages";
import { useRunJob } from "@/lib/use-run-job";
import type { DraftCheckInput, RunJob } from "@/types/api";
import { useEditor } from "../editor-context";
import { parseDecimal, type TestDraft } from "../question-draft";
import type { RunRow } from "./run-results-table";

export interface OutputConflict { key: string; index: number; expected: string; output: string }
interface Pending { mode: "generate" | "verify"; runId: string | null; tests: TestDraft[] }
export interface RunSummary { mode: "generate" | "verify"; job: RunJob; rows: RunRow[]; filled: number; failed: number }

const ok = (verdict: string) => verdict === "AC" || verdict === "OK";

/**
 * Một run job dùng chung cho “Sinh output từ lời giải” (draft_check) và “Kiểm tra đề” (problem_check) — §7.
 * Khi xong: điền output vào test có expected trống; test có expected khác output → trả danh sách xung đột để hỏi ghi đè.
 */
export function useSolutionRuns() {
  const { draft, update, bankId, questionId } = useEditor();
  const run = useRunJob();
  const pending = useRef<Pending | null>(null);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [conflicts, setConflicts] = useState<OutputConflict[]>([]);
  const [mode, setMode] = useState<Pending["mode"] | null>(null);
  const job = run.job;

  useEffect(() => {
    const current = pending.current;
    if (!current || !job || job.run_id !== current.runId || (job.status !== "completed" && job.status !== "failed")) return;
    pending.current = null;
    const results = [...job.tests].sort((a, b) => a.position - b.position);
    const rows: RunRow[] = results.map((result, i) => {
      const test = current.tests[i];
      return { position: result.position, verdict: result.verdict, time_ms: result.time_ms, output: result.output,
        input: result.input ?? test?.input, expected: result.expected_output ?? (test?.expected_output || null) };
    });
    let filled = 0;
    const found: OutputConflict[] = [];
    if (current.mode === "generate" && job.status === "completed") {
      const fills = new Map<string, string>();
      results.forEach((result, i) => {
        const test = current.tests[i];
        if (!test || result.output == null) return;
        if (!test.expected_output && ok(result.verdict)) fills.set(test.key, result.output);
        else if (test.expected_output && result.verdict === "WA") found.push({ key: test.key, index: i, expected: test.expected_output, output: result.output });
      });
      filled = fills.size;
      if (fills.size) update((d) => ({ ...d, tests: d.tests.map((t) => fills.has(t.key) && !t.expected_output ? { ...t, expected_output: fills.get(t.key)! } : t) }));
    }
    setConflicts(found);
    setSummary({ mode: current.mode, job, rows, filled, failed: results.filter((r) => !ok(r.verdict)).length });
  }, [job, update]);

  async function launch(nextMode: Pending["mode"], path: string, body: unknown, tests: TestDraft[]) {
    setSummary(null); setConflicts([]); setMode(nextMode);
    pending.current = { mode: nextMode, runId: null, tests };
    try {
      const runId = await run.start(path, body);
      if (pending.current) pending.current.runId = runId;
    } catch (error) {
      pending.current = null; setMode(null);
      toast.error(errorText(error));
    }
  }

  function generate(): string | null {
    const p = draft.programming;
    if (!p.solution_code.trim()) return "Nhập lời giải mẫu trước.";
    if (!p.solution_language || !p.allowed_languages.includes(p.solution_language)) return "Chọn ngôn ngữ lời giải hợp lệ.";
    if (!draft.tests.length) return "Thêm ít nhất một test.";
    const time = Number(p.time_limit_ms);
    const body: DraftCheckInput = {
      bank_id: bankId, language: p.solution_language, source_code: p.solution_code,
      time_limit_ms: Number.isFinite(time) && time >= 100 ? Math.min(time, 10_000) : 1000,
      memory_limit_mb: p.memory_limit_mb, checker_mode: p.checker_mode,
      checker_epsilon: p.checker_mode === "float" ? parseDecimal(p.checker_epsilon) : null,
      tests: draft.tests.map((t) => ({ input: t.input, expected_output: t.expected_output ? t.expected_output : null })),
    };
    void launch("generate", "/questions/draft-check", body, draft.tests);
    return null;
  }

  function verify(savedTests: TestDraft[]) {
    if (questionId == null) return;
    void launch("verify", `/questions/${questionId}/verify`, undefined, savedTests);
  }

  function overwrite(keys: string[]) {
    const map = new Map(conflicts.filter((c) => keys.includes(c.key)).map((c) => [c.key, c.output]));
    update((d) => ({ ...d, tests: d.tests.map((t) => map.has(t.key) ? { ...t, expected_output: map.get(t.key)! } : t) }));
    setConflicts([]);
  }

  return { running: run.running, mode, summary, conflicts, generate, verify, overwrite, dismissConflicts: () => setConflicts([]) };
}
