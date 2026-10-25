import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AssignmentQuizPanel } from "@/features/assignments/assignment-quiz-panel";
import { AssignmentPracticePanel } from "@/features/assignments/assignment-practice-panel";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { AssignmentDetails, AssignmentSummary } from "@/types/api";

export function AssignmentStudentDialog({ assignment, onOpenChange }: { assignment: AssignmentSummary; onOpenChange: (open: boolean) => void }) {
  const details = useQuery({
    queryKey: queryKeys.assignments.details(assignment.id),
    queryFn: () => api.get<AssignmentDetails>(`/assignments/${assignment.id}`),
  });
  return <Dialog open onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
      <DialogHeader><DialogTitle className="font-heading">{assignment.title}</DialogTitle><DialogDescription>{assignment.description || "Bài tập của lớp"} · Hạn {new Date(assignment.due_at).toLocaleString("vi-VN")}</DialogDescription></DialogHeader>
      {details.isPending ? <p className="py-8 text-center text-sm text-muted-foreground">Đang tải câu hỏi…</p> : details.isError ? <p className="py-8 text-center text-sm text-destructive">Không tải được bài. Hãy đóng hộp thoại và thử lại.</p> : details.data?.assignment.category === "quiz" ? <AssignmentQuizPanel details={details.data} /> : details.data ? <AssignmentPracticePanel details={details.data} /> : null}
    </DialogContent>
  </Dialog>;
}
