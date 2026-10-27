import { utcDateTimeMillis } from "@/lib/date-time";
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

export const CHECKER_SHORT: Record<CheckerMode, string> = { token: "So theo từ", line: "So theo dòng", float: "So số thực" };

/** "31/10 18:29" (thêm năm khi khác năm hiện tại) — hàng meta, danh sách lượt. */
export function shortDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(utcDateTimeMillis(value));
  if (Number.isNaN(date.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = date.getFullYear() !== new Date().getFullYear() ? `/${date.getFullYear()}` : "";
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}${year} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Mô tả chính sách xem lại (assessment-spec §6). */
export function reviewPolicyText(item: AssignmentSummary): string {
  const mode = item.review_mode ?? "after_close";
  const answers = item.review_shows_answers ?? true;
  if (mode === "never") {
    return item.category === "quiz" ? "Chỉ xem tổng điểm từng lượt" : "Chỉ thấy trạng thái đã nộp";
  }
  const when = mode === "after_submit" ? "Xem lại ngay sau khi nộp" : `Xem lại từ ${shortDateTime(assignmentCloseAt(item))}`;
  return `${when}${answers ? ", kèm đáp án" : ", không hiện đáp án"}`;
}

/** Chính sách xem lại dạng ngắn cho dải thông tin quiz. */
export function reviewPolicyShort(item: AssignmentSummary): string {
  const mode = item.review_mode ?? "after_close";
  if (mode === "never") return "chỉ xem tổng điểm sau khi nộp";
  const what = (item.review_shows_answers ?? true) ? "xem đáp án" : "xem lại bài làm";
  return mode === "after_submit" ? `${what} ngay sau khi nộp` : `${what} sau khi bài đóng`;
}

export function attemptsText(used: number, max: number | null | undefined): string {
  if (max == null) return `${used} lượt · không giới hạn`;
  return `${used}/${max} lượt · còn ${Math.max(0, max - used)}`;
}

export function remainingAttempts(used: number, max: number | null | undefined): number | null {
  return max == null ? null : Math.max(0, max - used);
}
