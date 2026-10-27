import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssignmentQuestion, CorrectAnswer } from "@/types/api";
import type { DraftAnswer } from "./answer-model";

/** Props chung của ô trả lời theo loại câu. */
export interface AnswerFieldProps {
  question: AssignmentQuestion;
  value: DraftAnswer;
  onChange: (value: DraftAnswer) => void;
  /** Màn xem lại: không cho sửa. */
  readOnly?: boolean;
  /** Có khi chính sách xem lại cho hiện đáp án — dùng để đánh dấu đúng/sai từng phần. */
  correct?: CorrectAnswer | null;
  /** Tiền tố id duy nhất cho label/input. */
  idPrefix: string;
}

/** Biểu tượng đúng/sai kèm chữ cho trình đọc màn hình. */
export function CorrectnessMark({ ok, label, className }: { ok: boolean; label?: string; className?: string }) {
  const Icon = ok ? Check : X;
  return <span className={cn("inline-flex shrink-0 items-center gap-1 text-xs font-medium", ok ? "text-success" : "text-destructive", className)}>
    <Icon className="size-4" aria-hidden />
    <span className={label ? undefined : "sr-only"}>{label ?? (ok ? "Đúng" : "Sai")}</span>
  </span>;
}

/** Thanh lựa chọn kiểu quiz Frappe: nền xám, bo 8px, viền trong suốt (để viền đã chọn không làm nhảy layout). */
export const BAR = "rounded-lg border border-transparent bg-secondary px-4 py-3 text-sm transition-colors duration-150";

/** Ô nhập dạng thanh (trả lời ngắn, đáp số, điền chỗ trống) cao bằng thanh lựa chọn. */
export const BAR_INPUT = "h-11 rounded-lg px-4";

/** Nền thanh theo trạng thái đúng/sai trên màn xem lại. */
export function markTone(state: "correct" | "wrong" | null): string {
  if (state === "correct") return "bg-success/10 hover:bg-success/10 text-foreground";
  if (state === "wrong") return "bg-destructive/10 hover:bg-destructive/10 text-foreground";
  return "";
}
