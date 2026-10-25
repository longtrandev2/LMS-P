import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { AssignmentSubmission, AssignmentSummary } from "@/types/api";

export function AssignmentSubmissionsDialog({ assignment, onOpenChange }: { assignment: AssignmentSummary; onOpenChange: (open: boolean) => void }) {
  const query = useQuery({
    queryKey: queryKeys.assignments.submissions(assignment.id),
    queryFn: () => api.get<AssignmentSubmission[]>(`/assignments/${assignment.id}/submissions`),
  });
  return <Dialog open onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-3xl">
      <DialogHeader><DialogTitle className="font-heading">Bài nộp: {assignment.title}</DialogTitle><DialogDescription>Danh sách lượt nộp đã được chấm tự động. Mã người học và mã câu hỏi dùng để đối chiếu trong lớp.</DialogDescription></DialogHeader>
      {query.isPending ? <p className="py-8 text-center text-sm text-muted-foreground">Đang tải bài nộp…</p> : query.isError ? <p className="py-8 text-center text-sm text-destructive">Không tải được bài nộp.</p> : query.data?.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Chưa có bài nộp.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-muted-foreground"><th className="p-2">Người học</th><th className="p-2">Câu</th><th className="p-2">Lượt</th><th className="p-2">Điểm</th><th className="p-2">Thời điểm</th></tr></thead><tbody>{query.data?.map((row) => <tr key={row.id} className="border-b last:border-0"><td className="p-2">#{row.student_id ?? "—"}</td><td className="p-2">#{row.question_id}</td><td className="p-2">{row.attempt_no}</td><td className="p-2">{row.score ?? "—"}{row.is_late ? " · muộn" : ""}</td><td className="p-2">{new Date(row.submitted_at).toLocaleString("vi-VN")}</td></tr>)}</tbody></table></div>}
    </DialogContent>
  </Dialog>;
}
