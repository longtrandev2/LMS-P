import { CircleHelp, FileCode2, GraduationCap, NotebookPen, type LucideIcon } from "lucide-react";
import { utcDateTimeMillis } from "@/lib/date-time";
import type { AssignmentCategory, QuestionDifficulty, ReviewMode, ScorePolicy, SubmissionStatus } from "@/types/api";

/** Nhãn dùng chung cho các trang bài tập phía giảng viên — docs/assessment-spec.md §6. */
export const CATEGORY_OPTIONS: { id: AssignmentCategory; label: string; description: string }[] = [
  { id: "quiz", label: "Quiz", description: "Làm một lượt trọn đề, chấm ngay. Không nhận câu lập trình." },
  { id: "assignment", label: "Bài tập", description: "Nộp từng câu, mọi loại câu kể cả lập trình." },
  { id: "midterm", label: "Giữa kỳ", description: "Tính vào hạng mục giữa kỳ của bảng điểm." },
  { id: "final", label: "Cuối kỳ", description: "Tính vào hạng mục cuối kỳ của bảng điểm." },
];

/** Icon loại bài cho danh sách (DESIGN.md §4). */
export const CATEGORY_ICON: Record<AssignmentCategory, LucideIcon> = {
  quiz: CircleHelp, assignment: FileCode2, midterm: NotebookPen, final: GraduationCap,
};

export function categoryLabel(category: AssignmentCategory): string {
  return CATEGORY_OPTIONS.find((item) => item.id === category)?.label ?? category;
}

export const REVIEW_MODE_OPTIONS: { id: ReviewMode; label: string; description: string }[] = [
  { id: "after_close", label: "Sau khi đóng bài", description: "Sinh viên xem lại sau hạn chót (hoặc hạn nộp muộn nếu có)." },
  { id: "after_submit", label: "Ngay sau khi nộp", description: "Xem lại ngay khi nộp xong từng lượt." },
  { id: "never", label: "Không cho xem lại", description: "Sinh viên chỉ thấy tổng điểm hoặc trạng thái đã nộp." },
];

export const SCORE_POLICY_OPTIONS: { id: ScorePolicy; label: string; description: string }[] = [
  { id: "best", label: "Điểm cao nhất", description: "Lấy lượt có điểm cao nhất." },
  { id: "last", label: "Lượt gần nhất", description: "Lấy điểm của lượt nộp cuối cùng." },
];

export const DIFFICULTY_LABEL: Record<QuestionDifficulty, string> = { easy: "Dễ", medium: "Trung bình", hard: "Khó" };

export const STATUS_LABEL: Record<SubmissionStatus, string> = {
  pending: "Chờ chấm",
  grading: "Đang chấm",
  completed: "Đã chấm",
  failed: "Chấm lỗi",
};

/** Bỏ ký hiệu Markdown và ô `[[n]]` để hiện nội dung rút gọn trong danh sách. */
export function plainExcerpt(markdown: string, max = 160): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " [code] ")
    .replace(/\[\[(\d+)\]\]/g, "___")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`|~-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function formatPoints(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0$/, "");
}

/** Ngày giờ gọn cho hàng meta: "06/11 23:59" (cùng năm) hoặc "06/11/2027 23:59". */
export function shortDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(utcDateTimeMillis(value));
  if (Number.isNaN(date.getTime())) return "—";
  const two = (n: number) => String(n).padStart(2, "0");
  const year = date.getFullYear() === new Date().getFullYear() ? "" : `/${date.getFullYear()}`;
  return `${two(date.getDate())}/${two(date.getMonth() + 1)}${year} ${two(date.getHours())}:${two(date.getMinutes())}`;
}
