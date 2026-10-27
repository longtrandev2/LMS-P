import type { GradeComponent } from "@/types/api";

/** Thành phần điểm — docs/class-schedule-grades-spec.md §5. */
export const GRADE_COMPONENTS: GradeComponent[] = ["attendance", "assignment", "midterm", "final"];
export const GRADE_COMPONENT_LABEL: Record<GradeComponent, string> = {
  attendance: "Chuyên cần", assignment: "Bài tập", midterm: "Giữa kỳ", final: "Cuối kỳ",
};

/** Hiển thị điểm kiểu Việt Nam (dấu phẩy). `minDigits` = số chữ số thập phân tối thiểu (hệ 4 dùng 1 → "4,0"). */
export function formatScore(score: number | null | undefined, digits = 1, minDigits = 0): string {
  if (score == null) return "—";
  return score.toLocaleString("vi-VN", { minimumFractionDigits: minDigits, maximumFractionDigits: Math.max(digits, minDigits) });
}
