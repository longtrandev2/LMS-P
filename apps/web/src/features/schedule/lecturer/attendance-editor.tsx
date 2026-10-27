import { useState } from "react";
import { Ban, CheckCheck, Save, Users } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/state-blocks";
import { useUnsavedGuard } from "@/features/assignments/lecturer/use-unsaved-guard";
import { errorText } from "@/lib/error-messages";
import type { ClassSession, LeaveRequest, SessionAttendance } from "@/types/api";
import { AttendanceSheet } from "./attendance-sheet";
import { LeaveReviewDialog } from "./leave-review-dialog";
import { SessionHeading } from "./session-heading";
import { StatTiles, attendanceTiles } from "./stat-tiles";
import { countDraft, draftFrom, isDraftDirty, useSaveAttendance, type AttendanceDraft, type DraftRecord } from "./use-session-attendance";

/** Bản nháp điểm danh một buổi: ô thống kê realtime, thanh lưu dính đầu, cảnh báo rời trang khi chưa lưu. */
export function AttendanceEditor({ classId, data, prev, next }: {
  classId: string; data: SessionAttendance; prev?: ClassSession; next?: ClassSession;
}) {
  const session = data.session;
  const [baseline, setBaseline] = useState<AttendanceDraft>(() => draftFrom(data));
  const [draft, setDraft] = useState<AttendanceDraft>(baseline);
  const [leave, setLeave] = useState<LeaveRequest | null>(null);
  const save = useSaveAttendance(classId, session.id);
  const dirty = isDraftDirty(draft, baseline);
  const guard = useUnsavedGuard(dirty);
  const counts = countDraft(draft);
  const locked = session.is_cancelled;

  const change = (id: number, patch: Partial<DraftRecord>) => setDraft((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  // Chỉ điền "Có mặt" cho người chưa chọn; giữ trạng thái đã đặt (muộn, có phép theo đơn…).
  const allPresent = () => setDraft((d) => Object.fromEntries(Object.entries(d).map(([id, r]) => [id, { ...r, status: r.status ?? "present" }])));

  async function submit() {
    try {
      await save.mutateAsync(draft);
      setBaseline(draft);
      toast.success(counts.unmarked ? `Đã lưu điểm danh. Còn ${counts.unmarked} sinh viên chưa chọn trạng thái.` : "Đã lưu điểm danh.");
    } catch (e) { toast.error(errorText(e)); }
  }

  const tiles = [
    { key: "size", label: "Sĩ số", value: data.items.length, tone: "brand" as const, icon: Users },
    { key: "unmarked", label: "Chưa điểm danh", value: counts.unmarked, tone: "neutral" as const, icon: Ban },
    ...attendanceTiles(counts),
  ];

  return (
    <div data-layout="wide" className="mx-auto w-full max-w-6xl space-y-6">
      <SessionHeading session={session} prev={prev} next={next} onNavigate={(s) => guard.requestLeave(`/classes/${classId}/sessions/${s.id}`)} />
      <StatTiles tiles={tiles} className="lg:grid-cols-6" />
      {locked ? <p role="status" className="rounded-lg bg-secondary px-4 py-2.5 text-sm text-muted-foreground">Buổi đã hủy — không điểm danh được. Khôi phục buổi ở tab Lịch học để điểm danh.</p> : null}

      <section aria-label="Danh sách điểm danh" className="space-y-1">
        <div className="sticky top-12 z-10 -mx-1 flex flex-wrap items-center justify-between gap-2 bg-background/95 px-1 py-2.5 backdrop-blur supports-backdrop-filter:bg-background/80">
          <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
            {dirty ? <span className="font-medium text-warning">Có thay đổi chưa lưu</span>
              : session.attendance_taken_at ? "Đã lưu điểm danh" : "Chưa điểm danh buổi này"}
            {" · "}{data.items.length - counts.unmarked}/{data.items.length} sinh viên đã chọn
          </p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" disabled={locked || data.items.length === 0} onClick={allPresent}><CheckCheck aria-hidden /> Tất cả có mặt</Button>
            <Button disabled={locked || save.isPending || (!dirty && !!session.attendance_taken_at) || counts.unmarked === data.items.length} onClick={submit}>
              <Save aria-hidden /> {save.isPending ? "Đang lưu…" : "Lưu điểm danh"}
            </Button>
          </div>
        </div>
        {data.items.length === 0
          ? <EmptyState icon={Users} title="Lớp chưa có sinh viên" description="Thêm sinh viên ở tab Sinh viên của lớp để điểm danh." />
          : <AttendanceSheet rows={data.items} draft={draft} disabled={locked} onChange={change} onOpenLeave={setLeave} />}
      </section>

      {leave ? <LeaveReviewDialog classId={classId} request={leave} onOpenChange={(open) => { if (!open) setLeave(null); }} /> : null}
      <AlertDialog open={guard.pendingHref != null} onOpenChange={(open) => { if (!open) guard.cancelLeave(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rời trang khi chưa lưu điểm danh?</AlertDialogTitle>
            <AlertDialogDescription>Các thay đổi trạng thái và ghi chú của buổi này sẽ mất.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ở lại</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={guard.confirmLeave}>Rời trang</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
