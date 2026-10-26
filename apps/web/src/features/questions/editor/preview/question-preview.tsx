import { Eye } from "lucide-react";
import { MarkdownView } from "@/components/markdown-view";
import { questionTypeLabel } from "@/lib/question-types";
import type { QuestionDraft } from "../question-draft";
import { AnswerPreview } from "./answer-preview";
import { ProgrammingPreview } from "./programming-preview";

const DIFFICULTY = { easy: "Dễ", medium: "Trung bình", hard: "Khó" } as const;

/** Thay `[[n]]` bằng chip mã để sinh viên thấy vị trí ô. */
const withBlankChips = (content: string) => content.replace(/\[\[(\d{1,2})\]\]/g, (_, n: string) => ` \`[ ${n} ]\` `);

/** Câu hỏi như sinh viên thấy (ô trả lời disabled). `showAnswers` dùng cho chế độ chỉ xem. */
export function QuestionPreview({ draft, showAnswers = false, title = "Xem trước" }: { draft: QuestionDraft; showAnswers?: boolean; title?: string }) {
  const content = draft.type === "fill_blank" ? withBlankChips(draft.content) : draft.content;
  return <section aria-label={title} className="overflow-hidden rounded-xl border bg-card">
    <header className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold"><Eye className="size-4 text-muted-foreground" aria-hidden />{title}</span>
      <span className="text-xs text-muted-foreground">{questionTypeLabel(draft.type)} · {DIFFICULTY[draft.difficulty]}</span>
    </header>
    <div className="space-y-5 p-4 sm:p-5">
      {content.trim() ? <MarkdownView source={content} /> : <p className="text-sm text-muted-foreground italic">Nội dung câu hỏi sẽ hiện ở đây.</p>}
      {draft.type === "programming" ? <ProgrammingPreview draft={draft} /> : <AnswerPreview draft={draft} showAnswers={showAnswers} />}
      {showAnswers && draft.explanation.trim() ? <div className="space-y-1.5 border-t pt-4">
        <p className="text-xs font-semibold text-muted-foreground">Giải thích đáp án</p>
        <MarkdownView source={draft.explanation} />
      </div> : null}
    </div>
  </section>;
}
