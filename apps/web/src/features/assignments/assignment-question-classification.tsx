import { Badge } from "@/components/ui/badge";
import type { AssignmentQuestion } from "@/types/api";

const difficultyLabel = { easy: "Cơ bản", medium: "Trung bình", hard: "Nâng cao" };

export function AssignmentQuestionClassification({ question }: { question: AssignmentQuestion }) {
  return <div className="flex flex-wrap items-center gap-2">
    <Badge variant="secondary">{question.type === "programming" ? "Lập trình" : "Trắc nghiệm"}</Badge>
    {question.topic ? <Badge variant="outline">{question.topic}</Badge> : null}
    <Badge variant="outline">{difficultyLabel[question.difficulty]}</Badge>
  </div>;
}
