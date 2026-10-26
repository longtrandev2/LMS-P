import type { ReactNode } from "react";
import { questionTypeLabel } from "@/lib/question-types";
import type { AssignmentQuestion } from "@/types/api";
import { formatScore } from "../../submission-result";

/** Dòng tiêu đề thẻ câu: số thứ tự, loại, điểm, trạng thái. */
export function QuestionCardHeader({ index, question, status, titleId }: {
  index: number; question: AssignmentQuestion; status?: ReactNode; titleId: string;
}) {
  return <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-3">
    <h3 id={titleId} className="text-sm font-semibold">Câu {index + 1}</h3>
    <span className="text-xs text-muted-foreground tabular-nums">{questionTypeLabel(question.type)} · {formatScore(question.points)} điểm</span>
    {status ? <span className="ml-auto text-xs font-medium">{status}</span> : null}
  </header>;
}
