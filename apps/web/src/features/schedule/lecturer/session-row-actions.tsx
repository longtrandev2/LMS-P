import { useState } from "react";
import { Link } from "react-router-dom";
import { Ban, ClipboardCheck, MoreHorizontal, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { errorText } from "@/lib/error-messages";
import { sessionDateLabel } from "@/lib/schedule";
import type { ClassSession } from "@/types/api";
import { useScheduleMutations } from "./use-schedule";

/** Thao tác một buổi: Điểm danh · Sửa · menu `…` (hủy/khôi phục, xóa khi chưa điểm danh). */
export function SessionRowActions({ classId, session, onEdit }: {
  classId: string; session: ClassSession; onEdit: (session: ClassSession) => void;
}) {
  const { setCancelled, remove } = useScheduleMutations(classId);
  const [confirm, setConfirm] = useState<"cancel" | "delete" | null>(null);
  const label = `buổi ${session.session_no}`;

  async function run() {
    try {
      if (confirm === "delete") await remove.mutateAsync(session.id);
      else await setCancelled.mutateAsync({ id: session.id, cancelled: true });
      toast.success(confirm === "delete" ? "Đã xóa buổi học." : "Đã hủy buổi học.");
    } catch (error) {
      toast.error(errorText(error));
    } finally {
      setConfirm(null);
    }
  }
  async function restore() {
    try {
      await setCancelled.mutateAsync({ id: session.id, cancelled: false });
      toast.success("Đã khôi phục buổi học.");
    } catch (error) { toast.error(errorText(error)); }
  }

  return (
    <div className="inline-flex items-center gap-0.5">
      {session.is_cancelled ? null : (
        <Button variant="secondary" size="xs" asChild>
          <Link to={`/classes/${classId}/sessions/${session.id}`} aria-label={`Điểm danh ${label}`}>
            <ClipboardCheck className="size-3.5" aria-hidden /> Điểm danh
          </Link>
        </Button>
      )}
      <Button variant="ghost" size="icon-xs" title="Sửa thông tin buổi" aria-label={`Sửa ${label}`} onClick={() => onEdit(session)}><Pencil className="size-3.5" aria-hidden /></Button>
      {session.is_cancelled ? (
        <Button variant="ghost" size="icon-xs" title="Khôi phục buổi học" aria-label={`Khôi phục ${label}`} onClick={restore}>
          <RotateCcw className="size-3.5" aria-hidden />
        </Button>
      ) : (
        <Button variant="ghost" size="icon-xs" title="Hủy buổi học" aria-label={`Hủy ${label}`} className="text-muted-foreground hover:text-foreground" onClick={() => setConfirm("cancel")}>
          <Ban className="size-3.5" aria-hidden />
        </Button>
      )}
      {!session.attendance_taken_at ? (
        <Button variant="ghost" size="icon-xs" title="Xóa buổi học" aria-label={`Xóa ${label}`} className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setConfirm("delete")}>
          <Trash2 className="size-3.5" aria-hidden />
        </Button>
      ) : null}
      <AlertDialog open={confirm != null} onOpenChange={(open) => { if (!open) setConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm === "delete" ? "Xóa" : "Hủy"} buổi {session.session_no}?</AlertDialogTitle>
            <AlertDialogDescription>
              {sessionDateLabel(session.date)}.{" "}
              {confirm === "delete"
                ? "Buổi bị xóa hẳn khỏi lịch. Buổi đã có đơn xin nghỉ không xóa được — hãy hủy buổi."
                : "Buổi hủy không được điểm danh và không tính vào thống kê, điểm chuyên cần. Có thể khôi phục sau."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Đóng</AlertDialogCancel>
            <AlertDialogAction variant={confirm === "delete" ? "destructive" : "default"} onClick={(event) => { event.preventDefault(); void run(); }}>
              {confirm === "delete" ? "Xóa buổi" : "Hủy buổi"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
