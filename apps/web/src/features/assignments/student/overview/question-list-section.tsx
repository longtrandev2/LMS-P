import { FileQuestion } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/state-blocks";
import { useAuthStore } from "@/stores/auth";
import type { AssignmentDetails } from "@/types/api";
import { useMySubmissions } from "../use-student-data";
import { ObjectiveQuestionCard } from "./objective-question-card";
import { ProgrammingQuestionCard } from "./programming-question-card";

/** Bài thường (không phải quiz): danh sách câu dạng hàng, nộp từng câu. */
export function QuestionListSection({ details }: { details: AssignmentDetails }) {
  const item = details.assignment;
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const history = useMySubmissions(item.id);

  return <section aria-labelledby="question-list-title">
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-3">
      <h2 id="question-list-title" className="text-base font-semibold">
        Câu hỏi <span className="text-sm font-normal text-muted-foreground tabular-nums">{details.questions.length}</span>
      </h2>
      <p className="text-xs text-muted-foreground">Nộp từng câu; câu chưa nộp tính 0 điểm.</p>
    </div>
    {details.questions.length === 0 ? <EmptyState icon={FileQuestion} title="Bài chưa có câu hỏi" description="Giảng viên chưa thêm câu hỏi cho bài này." />
      : history.isPending ? <div aria-busy="true" aria-label="Đang tải" className="space-y-4 py-4"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
      : history.isError ? <ErrorState error={history.error} onRetry={() => void history.refetch()} />
      : <ol>
        {details.questions.map((question, index) => {
          const submissions = history.data.filter((row) => row.question_id === question.question_id);
          return question.type === "programming"
            ? <ProgrammingQuestionCard key={question.question_id} item={item} question={question} index={index} submissions={submissions} />
            : <ObjectiveQuestionCard key={question.question_id} item={item} question={question} index={index} submissions={submissions} userId={userId} />;
        })}
      </ol>}
  </section>;
}
