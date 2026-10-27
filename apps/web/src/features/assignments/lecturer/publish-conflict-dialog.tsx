import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { PublishConflict } from "./use-save-assignment";

/**
 * 409 khi xuất bản (docs/assessment-spec.md §7): PROBLEM_UNVERIFIED cho phép "Vẫn xuất bản"
 * (gửi lại `confirm_unverified=true`); PROBLEM_CHECK_FAILED chỉ báo lỗi + liên kết câu cần sửa.
 */
export function PublishConflictDialog({ conflict, busy, questionLabel, onCancel, onConfirm }: {
  conflict: PublishConflict | null; busy: boolean; questionLabel?: (id: number) => string;
  onCancel: () => void; onConfirm: () => void;
}) {
  const unverified = conflict?.code === "PROBLEM_UNVERIFIED";
  return <AlertDialog open={conflict != null} onOpenChange={(open) => !open && onCancel()}>
    <AlertDialogContent className="sm:max-w-lg!">
      <AlertDialogHeader>
        <AlertDialogTitle>
          {unverified ? "Có câu lập trình chưa kiểm tra đề" : "Lời giải mẫu chưa đạt bộ test"}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {unverified
            ? "Lời giải mẫu chưa được chạy trên bộ test của phiên bản sắp ghim (chưa kiểm tra, đang chạy, lỗi hệ thống hoặc câu không có lời giải). Nếu test sai, sinh viên có thể bị chấm sai."
            : "Lời giải mẫu không đạt (khác AC) trên phiên bản sắp ghim. Sửa đề hoặc bộ test, chạy kiểm tra lại rồi mới xuất bản được."}
        </AlertDialogDescription>
      </AlertDialogHeader>
      {conflict?.questionIds.length ? <ul className="space-y-1.5">
        {conflict.questionIds.map((id) => <li key={id}>
          <Link to={`/questions/${id}/edit`} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-foreground underline decoration-border underline-offset-4 outline-none hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring">
            <ExternalLink className="size-3.5" aria-hidden />{questionLabel?.(id) ?? `Câu hỏi #${id}`}
          </Link>
        </li>)}
      </ul> : <p className="text-sm text-muted-foreground">{conflict?.message}</p>}
      <AlertDialogFooter>
        <AlertDialogCancel disabled={busy}>{unverified ? "Quay lại" : "Đóng"}</AlertDialogCancel>
        {unverified ? <AlertDialogAction variant="cta" disabled={busy} onClick={(event) => { event.preventDefault(); onConfirm(); }}>
          {busy ? "Đang xuất bản…" : "Vẫn xuất bản"}
        </AlertDialogAction> : null}
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
