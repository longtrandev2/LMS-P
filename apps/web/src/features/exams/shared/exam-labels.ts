import type { AssignmentCategory, AssignmentSummary } from "@/types/api";
import type { PaperMode } from "@/types/exams";

/** Nhãn dùng chung cho kỳ thi / cấu trúc đề — docs/exam-spec.md §2–3. */
export const PAPER_MODE_OPTIONS: { id: PaperMode; label: string; description: string }[] = [
  { id: "same", label: "Một đề chung", description: "Cả lớp làm cùng một đề. Câu ngẫu nhiên được bốc một lần khi xuất bản." },
  { id: "variants", label: "Nhiều mã đề", description: "Sinh 2–20 mã đề (101, 102…), chia đều mã đề cho sinh viên." },
  { id: "per_student", label: "Mỗi sinh viên một đề", description: "Mỗi sinh viên bốc đề riêng từ kho câu khi bắt đầu làm bài." },
];

export function paperModeLabel(mode: PaperMode | undefined, variantCount?: number | null): string {
  if (mode === "variants") return variantCount ? `${variantCount} mã đề` : "Nhiều mã đề";
  if (mode === "per_student") return "Mỗi SV một đề";
  return "Một đề chung";
}

/** Mã đề hiển thị: biến thể 1 → "101". */
export function variantCode(variantNo: number): string {
  return String(100 + variantNo);
}

export function isExamCategory(category: AssignmentCategory): boolean {
  return category === "midterm" || category === "final";
}

/** Bài có cấu trúc đề (phần, quy tắc, cách giao đề): mọi hạng mục trừ bài tập thường. */
export function hasBlueprint(category: AssignmentCategory): boolean {
  return category !== "assignment";
}

export function isExamItem(item: AssignmentSummary): boolean {
  return isExamCategory(item.category);
}

/** Số La Mã cho tên phần mặc định ("Phần II"). */
export function roman(value: number): string {
  const table: [number, string][] = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let rest = value;
  let out = "";
  for (const [n, s] of table) while (rest >= n) { out += s; rest -= n; }
  return out || String(value);
}

export function minutesLabel(minutes: number | null | undefined): string | null {
  return minutes ? `${minutes} phút` : null;
}
