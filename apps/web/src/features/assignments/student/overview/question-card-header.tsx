import type { ReactNode } from "react";
import { Code2, ListChecks } from "lucide-react";
import type { AssignmentQuestion } from "@/types/api";

/** Hàng câu hỏi trong danh sách: icon loại · `Câu n` + tiêu đề 14/500 + meta 12 xám · trạng thái · hành động. */
export function QuestionCardHeader({ index, question, title, meta, status, action, titleId }: {
  index: number; question: AssignmentQuestion; title: ReactNode; meta: ReactNode;
  status?: ReactNode; action?: ReactNode; titleId: string;
}) {
  const Icon = question.type === "programming" ? Code2 : ListChecks;
  return <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
    <Icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden />
    <div className="min-w-0 flex-1">
      <h3 id={titleId} className="truncate text-sm font-medium">
        <span className="text-muted-foreground">Câu {index + 1}</span><span aria-hidden className="mx-1.5 text-muted-foreground">·</span>{title}
      </h3>
      <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">{meta}</p>
    </div>
    {status ? <span className="text-sm">{status}</span> : null}
    {action}
  </div>;
}
