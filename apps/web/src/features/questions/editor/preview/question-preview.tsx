import { MarkdownView } from "@/components/markdown-view";
import { Badge } from "@/components/ui/badge";
import { questionTypeLabel } from "@/lib/question-types";
import { DIFFICULTY_LABEL, DIFFICULTY_VARIANT } from "../../question-labels";
import type { QuestionDraft } from "../question-draft";
import { AnswerPreview } from "./answer-preview";
import { ProgrammingPreview } from "./programming-preview";

/** Thay `[[n]]` bằng chip mã để sinh viên thấy vị trí ô. */
const withBlankChips = (content: string) => content.replace(/\[\[(\d{1,2})\]\]/g, (_, n: string) => ` \`[ ${n} ]\` `);

/**
 * Panel xem trước kiểu khung câu của quiz Frappe: dòng đầu “loại câu” xám + độ khó, đề, ô trả lời disabled.
 * `showAnswers` dùng cho chế độ chỉ xem (đánh dấu đáp án đúng + giải thích).
 */
export function QuestionPreview({ draft, showAnswers = false, title = "Xem trước" }: { draft: QuestionDraft; showAnswers?: boolean; title?: string }) {
  const content = draft.type === "fill_blank" ? withBlankChips(draft.content) : draft.content;
  return <section aria-label={title} className="rounded-xl border bg-card">
    <header className="flex items-center justify-between gap-2 border-b px-5 py-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      <span className="text-xs text-muted-foreground">{showAnswers ? "Kèm đáp án" : "Như sinh viên thấy"}</span>
    </header>
    <div className="space-y-5 p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">{questionTypeLabel(draft.type)}</span>
        <Badge variant={DIFFICULTY_VARIANT[draft.difficulty]}>{DIFFICULTY_LABEL[draft.difficulty]}</Badge>
      </div>
      <div className="text-[15px]">
        {content.trim() ? <MarkdownView source={content} /> : <p className="text-sm text-muted-foreground">Nội dung câu hỏi sẽ hiện ở đây.</p>}
      </div>
      {draft.type === "programming" ? <ProgrammingPreview draft={draft} /> : <AnswerPreview draft={draft} showAnswers={showAnswers} />}
      {showAnswers && draft.explanation.trim() ? <div className="space-y-2 border-t pt-4">
        <p className="text-xs font-medium text-muted-foreground">Giải thích đáp án</p>
        <MarkdownView source={draft.explanation} />
      </div> : null}
    </div>
  </section>;
}
