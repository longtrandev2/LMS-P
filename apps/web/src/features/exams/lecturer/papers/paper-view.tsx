import { Shuffle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MarkdownView } from "@/components/markdown-view";
import { questionTypeLabel } from "@/lib/question-types";
import { DIFFICULTY_LABEL, formatPoints } from "@/features/assignments/lecturer/labels";
import type { PreviewPaper, PreviewQuestion } from "@/types/exams";

function QuestionItem({ question, number }: { question: PreviewQuestion; number: number }) {
  return <li className="flex gap-3 border-b py-3.5 last:border-b-0">
    <span className="w-7 shrink-0 pt-0.5 font-mono text-xs text-muted-foreground tabular-nums">{String(number).padStart(2, "0")}</span>
    <div className="min-w-0 flex-1 space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge>{questionTypeLabel(question.type)}</Badge>
        <Badge variant="secondary">{DIFFICULTY_LABEL[question.difficulty]}</Badge>
        {question.rule_id != null ? <Badge variant="info"><Shuffle aria-hidden />Ngẫu nhiên</Badge> : <Badge variant="secondary">Cố định</Badge>}
      </div>
      <MarkdownView source={question.content.replace(/\[\[(\d+)\]\]/g, "\\_\\_\\_\\_\\_")} />
    </div>
    <span className="shrink-0 pt-0.5 text-sm font-semibold tabular-nums">{formatPoints(question.points)} đ</span>
  </li>;
}

/** Một đề (hoặc đề mẫu): các phần, câu đánh số liên tục, loại/độ khó, điểm, đánh dấu câu bốc ngẫu nhiên. */
export function PaperView({ paper }: { paper: PreviewPaper }) {
  let counter = 0;
  const named = paper.sections.length > 1 || !!paper.sections[0]?.title;
  return <div className="space-y-6">
    {paper.sections.map((section, index) => {
      const points = section.questions.reduce((sum, q) => sum + q.points, 0);
      return <section key={index} aria-label={section.title || `Phần ${index + 1}`} className="space-y-1">
        {named ? <header className="flex items-baseline justify-between gap-3 border-b pb-2">
          <h3 className="text-sm font-semibold">{section.title || `Phần ${index + 1}`}</h3>
          <span className="text-xs text-muted-foreground tabular-nums">{section.questions.length} câu · {formatPoints(Math.round(points * 100) / 100)} điểm</span>
        </header> : null}
        {section.questions.length === 0 ? <p className="py-3 text-sm text-muted-foreground">Phần này chưa có câu nào.</p>
          : <ol>{section.questions.map((question) => <QuestionItem key={question.question_id} question={question} number={++counter} />)}</ol>}
      </section>;
    })}
  </div>;
}
