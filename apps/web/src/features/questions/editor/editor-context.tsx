import { createContext, useContext } from "react";
import { cn } from "@/lib/utils";
import type { QuestionDraft } from "./question-draft";
import type { FieldErrors } from "./question-validation";
import type { ProgrammingRules } from "./programming/programming-rules";

export interface EditorApi {
  draft: QuestionDraft;
  update: (recipe: (draft: QuestionDraft) => QuestionDraft) => void;
  patch: (patch: Partial<QuestionDraft>) => void;
  errors: FieldErrors;
  bankId: number;
  questionId: number | null;
  /** Bản đã lưu có khớp form hiện tại không (dùng cho kiểm tra đề). */
  dirty: boolean;
  /** Ràng buộc câu lập trình theo cấu hình hệ thống. */
  rules: ProgrammingRules;
}

export const EditorContext = createContext<EditorApi | null>(null);

export function useEditor(): EditorApi {
  const value = useContext(EditorContext);
  if (!value) throw new Error("useEditor phải nằm trong EditorContext");
  return value;
}

/** Thông báo lỗi tại trường; `id` dùng cho aria-describedby. */
export function FieldMessage({ id, error, hint }: { id: string; error?: string; hint?: React.ReactNode }) {
  if (!error && !hint) return null;
  return <p id={id} role={error ? "alert" : undefined} className={cn("text-xs leading-5", error ? "text-destructive" : "text-muted-foreground")}>
    {error ?? hint}
  </p>;
}

/**
 * Một section của trang soạn (DESIGN.md §4 Trang soạn): tiêu đề 16/600 + mô tả xám, không bọc khung —
 * các section ngăn bằng `border-t` và khoảng trắng.
 */
export function EditorSection({ title, description, actions, children, field, className }: {
  title: string; description?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; field?: string; className?: string;
}) {
  return <section data-field={field} className={cn("scroll-mt-32 space-y-5 border-t pt-8 first:border-t-0 first:pt-0", className)}>
    <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <div className="min-w-0 space-y-1">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {description ? <p className="max-w-2xl text-sm leading-5 text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
    <div className="space-y-4">{children}</div>
  </section>;
}
