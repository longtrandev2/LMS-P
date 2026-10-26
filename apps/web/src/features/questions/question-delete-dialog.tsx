import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import type { QuestionSummary } from "@/types/api";

/** Xác nhận xóa mềm câu hỏi; snapshot của bài đã xuất bản giữ nguyên. */
export function QuestionDeleteDialog({ question, onClose, onDeleted }: { question: QuestionSummary; onClose: () => void; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false);
  async function remove(event: React.MouseEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.delete(`/questions/${question.id}`);
      toast.success("Đã đưa câu hỏi ra khỏi ngân hàng.");
      onDeleted(); onClose();
    } catch (error) { toast.error(errorText(error)); }
    finally { setBusy(false); }
  }
  return <AlertDialog open onOpenChange={(open) => !open && onClose()}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle className="font-heading">Xóa câu hỏi #{question.id} khỏi ngân hàng?</AlertDialogTitle>
        <AlertDialogDescription>Câu hỏi bị ẩn khỏi danh sách và không thể thêm vào bài mới. Bài đã xuất bản vẫn giữ nguyên phiên bản đã ghim.</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={busy}>Hủy</AlertDialogCancel>
        <AlertDialogAction variant="destructive" disabled={busy} onClick={remove}><Trash2 aria-hidden /> {busy ? "Đang xóa…" : "Xóa câu hỏi"}</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
