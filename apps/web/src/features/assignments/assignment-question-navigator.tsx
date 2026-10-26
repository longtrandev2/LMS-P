import { useMemo } from "react";
import { Code2, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssignmentQuestion } from "@/types/api";

const groups = [
  { type: "mcq", label: "Trắc nghiệm", Icon: ListChecks },
  { type: "programming", label: "Lập trình", Icon: Code2 },
] as const;

export function AssignmentQuestionNavigator({ questions, activeId, onSelect }: {
  questions: AssignmentQuestion[]; activeId: number | null; onSelect: (id: number) => void;
}) {
  const positions = useMemo(() => new Map(questions.map((question, index) => [question.question_id, index + 1])), [questions]);
  return <aside aria-label="Điều hướng câu hỏi" className="h-fit rounded-2xl border bg-card p-4 shadow-sm lg:col-start-2 lg:row-start-1 lg:sticky lg:top-24">
    <div className="mb-4"><h2 className="font-semibold">Danh sách câu</h2><p className="text-xs text-muted-foreground">Chọn số câu để chuyển nhanh</p></div>
    <div className="space-y-5">
      {groups.map(({ type, label, Icon }) => {
        const items = questions.filter((question) => question.type === type);
        if (!items.length) return null;
        return <section key={type} aria-label={label}>
          <div className="mb-2 flex items-center justify-between text-xs"><span className="flex items-center gap-2 font-medium"><Icon className="size-3.5 text-primary" aria-hidden />{label}</span><span className="text-muted-foreground">{items.length} câu</span></div>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-5">
            {items.map((question) => {
              const number = positions.get(question.question_id) ?? 0;
              return <button key={question.question_id} type="button" onClick={() => onSelect(question.question_id)}
                aria-label={`Chuyển đến câu ${number}: ${label}`} aria-current={activeId === question.question_id ? "location" : undefined}
                className={cn("grid size-10 place-items-center rounded-lg border text-sm font-semibold transition-colors hover:border-primary hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-ring",
                  activeId === question.question_id ? "border-primary bg-primary text-primary-foreground" : "bg-background text-foreground")}>
                {number}
              </button>;
            })}
          </div>
        </section>;
      })}
    </div>
    <div className="mt-5 border-t pt-3 text-xs text-muted-foreground">{questions.length} câu hỏi · {questions.reduce((sum, question) => sum + question.points, 0)} điểm</div>
  </aside>;
}
