import type { ReactNode, Ref } from "react";
import { questionTypeLabel } from "@/lib/question-types";
import { cn } from "@/lib/utils";
import type { AssignmentQuestion } from "@/types/api";
import { QuestionPrompt } from "./answers/answer-input";

/**
 * Khung một câu kiểu quiz Frappe (DESIGN.md §4 "Làm quiz"): `rounded-xl border p-6`, đầu khung `Câu 1 · Loại` xám +
 * điểm bên phải đậm, đề 15/500, phần trả lời, chân khung tùy chọn. Dùng chung cho làm quiz và xem lại.
 */
export function QuestionFrame({ question, index, titleId, aside, children, footer, headingRef, id, className }: {
  question: AssignmentQuestion; index: number; titleId: string; aside: ReactNode; children: ReactNode;
  footer?: ReactNode; headingRef?: Ref<HTMLHeadingElement>; id?: string; className?: string;
}) {
  return <section id={id} aria-labelledby={titleId} className={cn("rounded-xl border bg-card p-5 sm:p-6", className)}>
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <h2 id={titleId} ref={headingRef} tabIndex={headingRef ? -1 : undefined}
        className="scroll-mt-24 text-sm font-normal text-muted-foreground outline-none">
        Câu {index + 1}<span aria-hidden className="mx-1.5">·</span>{questionTypeLabel(question.type)}
      </h2>
      <div className="flex items-center gap-2 text-sm">{aside}</div>
    </div>
    <QuestionPrompt question={question} className="mt-3 text-[15px] font-medium" />
    <div className="mt-5">{children}</div>
    {footer ? <div className="mt-6 flex flex-wrap items-center gap-2">{footer}</div> : null}
  </section>;
}
