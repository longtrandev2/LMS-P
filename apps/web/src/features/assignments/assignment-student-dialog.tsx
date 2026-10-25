import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AssignmentQuizPanel } from "@/features/assignments/assignment-quiz-panel";
import { AssignmentPracticePanel } from "@/features/assignments/assignment-practice-panel";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { errorText } from "@/lib/error-messages";
import { formatUtcDateTime } from "@/lib/date-time";
import type { AssignmentDetails, AssignmentSummary } from "@/types/api";

export function AssignmentStudentDialog({ assignment, onOpenChange }: { assignment: AssignmentSummary; onOpenChange: (open: boolean) => void }) {
  const details = useQuery({
    queryKey: queryKeys.assignments.details(assignment.id),
    queryFn: () => api.get<AssignmentDetails>(`/assignments/${assignment.id}`),
  });
  return <Dialog open onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
      <DialogHeader><DialogTitle className="font-heading">{assignment.title}</DialogTitle><DialogDescription>{assignment.description || "Bài tập của lớp"} · Hạn {formatUtcDateTime(assignment.due_at)}</DialogDescription></DialogHeader>
      {details.isPending ? <p className="py-8 text-center text-sm text-muted-foreground">Đang tải câu hỏi…</p> : details.isError ? <div role="alert" className="flex flex-col items-center gap-3 py-8 text-center"><p className="text-sm text-destructive">{errorText(details.error)}</p><Button type="button" variant="outline" onClick={() => void details.refetch()}>Thử tải lại</Button></div> : details.data?.assignment.category === "quiz" ? <AssignmentQuizPanel details={details.data} /> : details.data ? <AssignmentPracticePanel details={details.data} /> : null}
    </DialogContent>
  </Dialog>;
}
