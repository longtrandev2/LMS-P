import { submissionResult } from "./submission-result";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { formatUtcDateTime } from "@/lib/date-time";
import type { AssignmentSubmission, AssignmentSummary } from "@/types/api";

export function AssignmentSubmissionsDialog({ assignment, onOpenChange }: { assignment: AssignmentSummary; onOpenChange: (open: boolean) => void }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const query = useQuery({
    queryKey: queryKeys.assignments.submissions(assignment.id),
    queryFn: () => api.get<AssignmentSubmission[]>(`/assignments/${assignment.id}/submissions`),
  });
  const details = useQuery({
    queryKey: queryKeys.assignments.details(assignment.id),
    queryFn: () => api.get<{ questions: { question_id: number; position: number }[] }>(`/assignments/${assignment.id}`),
  });
  const filtered = useMemo(() => (query.data ?? []).filter((row) => {
    const term = search.trim().toLowerCase();
    const student = `${row.student_full_name ?? ""} ${row.student_code ?? ""} ${row.student_id}`.toLowerCase();
    return (!term || student.includes(term)) && (status === "all" || row.status === status);
  }), [query.data, search, status]);
  const pending = query.data?.filter((row) => row.status === "pending" || row.status === "grading").length ?? 0;
  const questionPosition = new Map(details.data?.questions.map((question) => [question.question_id, question.position]));
  return <Dialog open onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-3xl">
      <DialogHeader><DialogTitle className="font-heading">Bài nộp: {assignment.title}</DialogTitle><DialogDescription>Theo dõi sinh viên, câu đã nộp và trạng thái chấm.</DialogDescription></DialogHeader>
      {query.isPending ? <p className="py-8 text-center text-sm text-muted-foreground">Đang tải bài nộp…</p> : query.isError ? <p className="py-8 text-center text-sm text-destructive">Không tải được bài nộp.</p> : query.data?.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Chưa có bài nộp.</p> : <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><p>{query.data?.length ?? 0} lượt nộp · {pending} đang chấm</p><div className="flex gap-2"><Input aria-label="Tìm sinh viên" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên hoặc mã sinh viên" className="w-56" /><select aria-label="Lọc trạng thái chấm" value={status} onChange={(event) => setStatus(event.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm"><option value="all">Mọi trạng thái</option><option value="pending">Chờ chấm</option><option value="grading">Đang chấm</option><option value="completed">Đã chấm</option><option value="failed">Chấm lỗi</option></select></div></div>
        {filtered.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Không tìm thấy bài nộp phù hợp.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-muted-foreground"><th className="p-2">Sinh viên</th><th className="p-2">Câu</th><th className="p-2">Lượt</th><th className="p-2">Kết quả</th><th className="p-2">Thời điểm</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.id} className="border-b last:border-0"><td className="p-2"><strong>{row.student_full_name || `Sinh viên #${row.student_id}`}</strong><span className="block text-xs text-muted-foreground">{row.student_code || `ID ${row.student_id}`}</span></td><td className="p-2">Câu {questionPosition.get(row.question_id) ?? `#${row.question_id}`}</td><td className="p-2">{row.attempt_no}</td><td className="p-2">{submissionResult(row)}{row.is_late ? " · muộn" : ""}</td><td className="p-2">{formatUtcDateTime(row.submitted_at)}</td></tr>)}</tbody></table></div>}
      </div>}
    </DialogContent>
  </Dialog>;
}
