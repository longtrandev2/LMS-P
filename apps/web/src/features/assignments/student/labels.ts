import { formatUtcDateTime } from "@/lib/date-time";
import type { AssignmentCategory, AssignmentSummary, CheckerMode } from "@/types/api";
import { assignmentCloseAt } from "../submission-window";

export const CATEGORY_LABEL: Record<AssignmentCategory, string> = {
  quiz: "Quiz",
  assignment: "Bài tập",
  midterm: "Giữa kỳ",
  final: "Cuối kỳ",
};

export const CHECKER_LABEL: Record<CheckerMode, string> = {
  token: "So theo từ — bỏ qua khác biệt khoảng trắng, xuống dòng",
  line: "So từng dòng — bỏ khoảng trắng cuối dòng và dòng trống cuối",
  float: "So số thực có sai số cho phép",
};

/** Mô tả chính sách xem lại (assessment-spec §6). */
export function reviewPolicyText(item: AssignmentSummary): string {
  const mode = item.review_mode ?? "after_close";
  const answers = item.review_shows_answers ?? true;
  if (mode === "never") {
    return item.category === "quiz"
      ? "Không xem lại chi tiết — chỉ thấy tổng điểm từng lượt."
      : "Không xem lại chi tiết câu khách quan — chỉ thấy trạng thái đã nộp.";
  }
  const when = mode === "after_submit" ? "Xem lại ngay sau khi nộp" : `Xem lại sau khi bài đóng (${formatUtcDateTime(assignmentCloseAt(item))})`;
  return `${when}, ${answers ? "kèm đáp án đúng và giải thích." : "không hiện đáp án đúng."}`;
}

export function attemptsText(used: number, max: number | null | undefined): string {
  if (max == null) return `${used} lượt · không giới hạn`;
  return `${used}/${max} lượt · còn ${Math.max(0, max - used)}`;
}

export function remainingAttempts(used: number, max: number | null | undefined): number | null {
  return max == null ? null : Math.max(0, max - used);
}
