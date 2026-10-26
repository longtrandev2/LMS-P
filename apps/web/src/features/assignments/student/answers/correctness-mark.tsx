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

/** Viền thẻ theo trạng thái đúng/sai trên màn xem lại. */
export function markTone(state: "correct" | "wrong" | null): string {
  if (state === "correct") return "border-success/50 bg-success/5";
  if (state === "wrong") return "border-destructive/50 bg-destructive/5";
  return "";
}
