import type { GradeComponent } from "@/types/api";

/** Thành phần điểm — docs/class-schedule-grades-spec.md §5. */
export const GRADE_COMPONENTS: GradeComponent[] = ["attendance", "assignment", "midterm", "final"];
export const GRADE_COMPONENT_LABEL: Record<GradeComponent, string> = {
  attendance: "Chuyên cần", assignment: "Bài tập", midterm: "Giữa kỳ", final: "Cuối kỳ",
};

/** Hiển thị điểm thang 10 kiểu Việt Nam (dấu phẩy, 1–2 chữ số thập phân). */
export function formatScore(score: number | null | undefined, digits = 1): string {
  if (score == null) return "—";
  return score.toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: digits });
}
