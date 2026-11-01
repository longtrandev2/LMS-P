import { ArrowDownUp, CircleDot, Code2, Hash, Link2, ListChecks, TextCursorInput, ToggleLeft, Type, type LucideIcon } from "lucide-react";
import type { QuestionDifficulty, QuestionType } from "@/types/api";

/** Icon nét cho từng loại câu (danh sách, chọn loại, header trang soạn). */
export const TYPE_ICON: Record<QuestionType, LucideIcon> = {
  mcq: CircleDot, multiple_choice: ListChecks, true_false: ToggleLeft, short_answer: Type, numeric: Hash,
  fill_blank: TextCursorInput, matching: Link2, ordering: ArrowDownUp, programming: Code2,
};

export const DIFFICULTY_LABEL: Record<QuestionDifficulty, string> = { easy: "Dễ", medium: "Trung bình", hard: "Khó" };

/** Badge tô nhạt theo độ khó (DESIGN.md §5). */
export const DIFFICULTY_VARIANT: Record<QuestionDifficulty, "success" | "warning" | "destructive"> = {
  easy: "success", medium: "warning", hard: "destructive",
};

/** Bỏ ký hiệu Markdown phổ biến để hiện đoạn trích gọn; `[[n]]` thành `[n]`. */
export const plainExcerpt = (content: string) => content
  .replace(/```[\s\S]*?```/g, " ").replace(/[#>*_`~]|\[\[(\d+)\]\]/g, (_match, n?: string) => n ? `[${n}]` : "")
  .replace(/\s+/g, " ").trim();
