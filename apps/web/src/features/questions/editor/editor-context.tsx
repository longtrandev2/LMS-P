import { createContext, useContext } from "react";
import { cn } from "@/lib/utils";
import type { QuestionDraft } from "./question-draft";
import type { FieldErrors } from "./question-validation";

export interface EditorApi {
  draft: QuestionDraft;
  update: (recipe: (draft: QuestionDraft) => QuestionDraft) => void;
  patch: (patch: Partial<QuestionDraft>) => void;
  errors: FieldErrors;
  bankId: number;
  questionId: number | null;
  /** Bản đã lưu có khớp form hiện tại không (dùng cho kiểm tra đề). */
  dirty: boolean;
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

/** Khung một nhóm trường trong form soạn câu. */
export function EditorSection({ title, description, actions, children, field, className }: {
  title: string; description?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; field?: string; className?: string;
}) {
  return <section data-field={field} className={cn("rounded-xl border bg-card", className)}>
    <header className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3 sm:px-5">
      <div className="min-w-0 space-y-0.5">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description ? <p className="text-xs leading-5 text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
    <div className="space-y-4 p-4 sm:p-5">{children}</div>
  </section>;
}
