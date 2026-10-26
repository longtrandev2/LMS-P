import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { MarkdownView } from "@/components/markdown-view";
import { ErrorState } from "@/components/state-blocks";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { questionTypeLabel, SCORING_MODE_LABEL, PARTIAL_SCORING_TYPES } from "@/lib/question-types";
import { DIFFICULTY_LABEL } from "./labels";
import { QuestionAnswerPreview } from "./question-answer-preview";
import type { Question } from "@/types/api";

/** Xem trước câu hỏi trong ngân hàng (`GET /questions/{id}`): nội dung, đáp án, thông số chấm. */
export function QuestionPreviewDialog({ questionId, onOpenChange }: { questionId: number | null; onOpenChange: (open: boolean) => void }) {
  const query = useQuery({
    queryKey: queryKeys.questions.detail(questionId ?? 0),
    queryFn: ({ signal }) => api.get<Question>(`/questions/${questionId}`, undefined, signal),
    enabled: questionId != null,
  });
  const q = query.data;
  return <Dialog open={questionId != null} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle className="font-heading">Xem trước câu hỏi</DialogTitle>
        <DialogDescription>
          {q ? `${questionTypeLabel(q.type)} · ${DIFFICULTY_LABEL[q.difficulty]} · ${q.bank_name} / ${q.category_name} · phiên bản ${q.version_no}` : "Đang tải nội dung câu hỏi."}
        </DialogDescription>
      </DialogHeader>
      {query.isPending ? <div className="space-y-3"><Skeleton className="h-20" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : null}
      {q ? <div className="space-y-5">
        <div className="rounded-lg border p-4"><MarkdownView source={q.content} /></div>
        <QuestionAnswerPreview question={q} />
        {PARTIAL_SCORING_TYPES.includes(q.type) && q.scoring_mode ? <p className="text-xs text-muted-foreground">Cách chấm: {SCORING_MODE_LABEL[q.scoring_mode]}</p> : null}
        {q.explanation ? <div className="space-y-1.5"><p className="text-xs font-medium text-muted-foreground">Giải thích</p><div className="rounded-lg bg-muted/40 p-3"><MarkdownView source={q.explanation} /></div></div> : null}
        <div className="flex justify-end">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/questions/${q.id}/edit`} target="_blank" rel="noreferrer"><ExternalLink aria-hidden />Mở trang sửa câu</Link>
          </Button>
        </div>
      </div> : null}
    </DialogContent>
  </Dialog>;
}
