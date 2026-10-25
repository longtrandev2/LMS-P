import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, ErrorState } from "@/components/state-blocks";
import { AssignmentFormDialog } from "@/features/assignments/assignment-form-dialog";
import { AssignmentStudentDialog } from "@/features/assignments/assignment-student-dialog";
import { AssignmentSubmissionsDialog } from "@/features/assignments/assignment-submissions-dialog";
import { assignmentWindow } from "@/features/assignments/submission-window";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import { formatUtcDateTime } from "@/lib/date-time";
import { queryKeys } from "@/lib/query-keys";
import type { AssignmentDetails, AssignmentSummary, Paginated } from "@/types/api";

const categoryLabel = { quiz: "Quiz", assignment: "Bài tập", midterm: "Giữa kỳ", final: "Cuối kỳ" };

export function AssignmentsSection({ classId, canManage, canTake = false }: {
  classId: string; canManage: boolean; canTake?: boolean;
}) {
  const client = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AssignmentDetails | null>(null);
  const [studentItem, setStudentItem] = useState<AssignmentSummary | null>(null);
  const [submissionItem, setSubmissionItem] = useState<AssignmentSummary | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const list = useQuery({
    queryKey: queryKeys.assignments.class(classId),
    queryFn: () => api.get<Paginated<AssignmentSummary>>(`/classes/${classId}/assignments`, { page: 1, limit: 100 }),
  });
  const invalidate = () => client.invalidateQueries({ queryKey: queryKeys.assignments.class(classId) });

  async function edit(item: AssignmentSummary) {
    setLoadingId(item.id);
    try {
      setEditing(await api.get<AssignmentDetails>(`/assignments/${item.id}`));
      setFormOpen(true);
    } catch (error) { toast.error(errorText(error)); }
    finally { setLoadingId(null); }
  }
  async function publish(item: AssignmentSummary) {
    setLoadingId(item.id);
    try { await api.post(`/assignments/${item.id}/publish`); toast.success("Đã xuất bản bài."); invalidate(); }
    catch (error) { toast.error(errorText(error)); }
    finally { setLoadingId(null); }
  }
  async function remove(item: AssignmentSummary) {
    if (!window.confirm(`Xóa bản nháp “${item.title}”?`)) return;
    setLoadingId(item.id);
    try { await api.delete(`/assignments/${item.id}`); toast.success("Đã xóa bản nháp."); invalidate(); }
    catch (error) { toast.error(errorText(error)); }
    finally { setLoadingId(null); }
  }

  return <section className="space-y-4">
    {canManage ? <div className="flex justify-end"><Button onClick={() => { setEditing(null); setFormOpen(true); }}>Tạo bài tập / quiz</Button></div> : null}
    {list.isPending ? <Card><CardContent className="p-6 text-sm text-muted-foreground">Đang tải danh sách bài…</CardContent></Card> : null}
    {list.isError ? <ErrorState error={list.error} onRetry={() => list.refetch()} /> : null}
    {list.data?.items.length === 0 ? <EmptyState title="Chưa có bài tập hoặc quiz" description={canManage ? "Tạo bản nháp rồi xuất bản để sinh viên làm." : "Giảng viên chưa đăng bài nào cho lớp."} /> : null}
    <div className="grid gap-3">
      {list.data?.items.map((item) => <Card key={item.id}><CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{item.title}</h3><span className="rounded-full bg-muted px-2 py-0.5 text-xs">{categoryLabel[item.category]}</span><span className={`rounded-full px-2 py-0.5 text-xs ${item.is_published ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{item.is_published ? "Đã xuất bản" : "Bản nháp"}</span></div>
          {item.description ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p> : null}
          <p className="mt-2 text-xs text-muted-foreground">{item.question_count} câu · {item.total_points} điểm{item.available_from ? ` · Mở ${formatUtcDateTime(item.available_from)}` : ""} · Hạn {formatUtcDateTime(item.due_at)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canTake ? <Button size="sm" disabled={assignmentWindow(item) === "upcoming"} onClick={() => setStudentItem(item)}>{assignmentWindow(item) === "upcoming" ? "Chưa mở" : "Mở bài"}</Button> : item.is_published ? <>
            {canManage ? <Button size="sm" variant="outline" disabled={loadingId === item.id} onClick={() => edit(item)}>Điều chỉnh</Button> : null}
            <Button size="sm" variant="outline" onClick={() => setSubmissionItem(item)}>Bài nộp</Button>
          </> : canManage ? <>
            <Button size="sm" variant="outline" disabled={loadingId === item.id} onClick={() => edit(item)}>Sửa</Button>
            <Button size="sm" disabled={loadingId === item.id || item.question_count === 0} onClick={() => publish(item)}>Xuất bản</Button>
            <Button size="sm" variant="ghost" disabled={loadingId === item.id} onClick={() => remove(item)}>Xóa</Button>
          </> : null}
        </div>
      </CardContent></Card>)}
    </div>
    {formOpen ? <AssignmentFormDialog classId={classId} details={editing} onOpenChange={setFormOpen} onSaved={invalidate} /> : null}
    {studentItem ? <AssignmentStudentDialog assignment={studentItem} onOpenChange={(open) => !open && setStudentItem(null)} /> : null}
    {submissionItem ? <AssignmentSubmissionsDialog assignment={submissionItem} onOpenChange={(open) => !open && setSubmissionItem(null)} /> : null}
  </section>;
}
