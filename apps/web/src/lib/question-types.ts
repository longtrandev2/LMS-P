import type { QuestionType, ScoringMode } from "@/types/api";

/** Nhãn và mô tả loại câu — docs/assessment-spec.md §1. */
export const QUESTION_TYPES: { id: QuestionType; label: string; description: string }[] = [
  { id: "mcq", label: "Một đáp án", description: "Chọn một lựa chọn đúng" },
  { id: "multiple_choice", label: "Nhiều đáp án", description: "Chọn tất cả lựa chọn đúng" },
  { id: "true_false", label: "Đúng / Sai", description: "Nhận định đúng hay sai" },
  { id: "short_answer", label: "Trả lời ngắn", description: "Gõ một từ hoặc cụm từ" },
  { id: "numeric", label: "Đáp số", description: "Nhập một số, có sai số cho phép" },
  { id: "fill_blank", label: "Điền chỗ trống", description: "Điền vào các ô trong đoạn văn" },
  { id: "matching", label: "Ghép cặp", description: "Nối mỗi mục bên trái với bên phải" },
  { id: "ordering", label: "Sắp xếp", description: "Sắp các mục theo đúng thứ tự" },
  { id: "programming", label: "Lập trình", description: "Viết chương trình, chấm bằng test" },
];

export function questionTypeLabel(type: QuestionType): string {
  return QUESTION_TYPES.find((item) => item.id === type)?.label ?? type;
}

export const SCORING_MODE_LABEL: Record<ScoringMode, string> = {
  all_or_nothing: "Đúng hết mới có điểm",
  partial: "Tính điểm từng phần",
};

export const PARTIAL_SCORING_TYPES: QuestionType[] = ["multiple_choice", "fill_blank", "matching", "ordering"];
