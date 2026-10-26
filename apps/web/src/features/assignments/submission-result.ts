import type { AssignmentSubmission } from "@/types/api";

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
