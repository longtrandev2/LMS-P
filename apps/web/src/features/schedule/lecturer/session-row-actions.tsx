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
    <div className="flex items-center justify-end gap-0.5">
      {session.is_cancelled ? null : (
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/classes/${classId}/sessions/${session.id}`} aria-label={`Điểm danh ${label}`}>
            <ClipboardCheck aria-hidden /> Điểm danh
          </Link>
        </Button>
      )}
      <Button variant="ghost" size="icon-sm" aria-label={`Sửa ${label}`} onClick={() => onEdit(session)}><Pencil aria-hidden /></Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Thao tác khác với ${label}`}><MoreHorizontal aria-hidden /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {session.is_cancelled
            ? <DropdownMenuItem onClick={restore}><RotateCcw aria-hidden /> Khôi phục buổi</DropdownMenuItem>
            : <DropdownMenuItem onClick={() => setConfirm("cancel")}><Ban aria-hidden /> Hủy buổi</DropdownMenuItem>}
          {session.attendance_taken_at ? null : (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setConfirm("delete")}><Trash2 aria-hidden /> Xóa buổi</DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
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
