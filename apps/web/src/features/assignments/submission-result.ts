import type { AssignmentSubmission, GradingVerdict } from "@/types/api";

const labels: Record<AssignmentSubmission["status"], string> = {
  pending: "Chờ chấm",
  grading: "Đang chấm",
  completed: "Chưa có điểm",
  failed: "Chấm lỗi",
};

export function submissionResult(submission: AssignmentSubmission): string {
  if (submission.verdict) return submission.verdict;
  return submission.score == null ? labels[submission.status] ?? "Chưa có điểm" : `${submission.score} điểm`;
}

/** Bài nộp đang chờ/đang chấm — cần poll hoặc chờ WS. */
export function isGrading(status: AssignmentSubmission["status"] | null | undefined): boolean {
  return status === "pending" || status === "grading";
}

/** Lượt tính vào `max_attempts`: submission `failed` (lỗi hạ tầng) không tính — assessment-spec §5. */
export function countedAttempts(submissions: AssignmentSubmission[]): number {
  return submissions.filter((item) => item.status !== "failed").length;
}

/** Mới nhất trước (theo lượt, rồi id). */
export function sortLatestFirst(submissions: AssignmentSubmission[]): AssignmentSubmission[] {
  return [...submissions].sort((a, b) => b.attempt_no - a.attempt_no || b.id - a.id);
}

/** Verdict tốt nhất của một câu code: AC nếu từng AC, ngược lại verdict của lượt chấm xong gần nhất. */
export function bestVerdict(submissions: AssignmentSubmission[]): GradingVerdict | null {
  if (submissions.some((item) => item.verdict === "AC")) return "AC";
  return sortLatestFirst(submissions).find((item) => item.verdict)?.verdict ?? null;
}

/** Điểm tốt nhất đã biết (null khi chưa được xem điểm). */
export function bestScore(submissions: AssignmentSubmission[]): number | null {
  const scores = submissions.map((item) => item.score).filter((score): score is number => score != null);
  return scores.length ? Math.max(...scores) : null;
}

export function formatScore(value: number | null | undefined): string {
  if (value == null) return "—";
  return value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
}
