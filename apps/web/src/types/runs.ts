// Hợp đồng run job (kiểm tra đề / chạy thử) — docs/assessment-spec.md §7, docs/api-spec.md §5–6.
import type { GradingVerdict } from "./assignments";
import type { CheckerMode, ProgrammingLanguage } from "./questions";

export type RunJobKind = "problem_check" | "draft_check" | "practice_run";
export type RunJobStatus = "pending" | "running" | "completed" | "failed";
export interface RunTestResult {
  position: number;
  verdict: GradingVerdict;
  time_ms?: number | null;
  output?: string | null;
  input?: string | null;
  expected_output?: string | null;
}
export interface RunJob {
  run_id: string;
  kind: RunJobKind;
  status: RunJobStatus;
  verdict?: GradingVerdict | null;
  compile_output?: string | null;
  error_message?: string | null;
  duration_ms?: number | null;
  tests: RunTestResult[];
  created_at: string;
  completed_at?: string | null;
}
export interface RunAccepted { run_id: string }
export interface DraftCheckInput {
  bank_id: number;
  language: ProgrammingLanguage;
  source_code: string;
  time_limit_ms: number;
  memory_limit_mb: number;
  checker_mode: CheckerMode;
  checker_epsilon?: number | null;
  tests: { input: string; expected_output?: string | null }[];
}
export interface PracticeRunInput {
  language: ProgrammingLanguage;
  source_code: string;
  custom_input?: string | null;
}
