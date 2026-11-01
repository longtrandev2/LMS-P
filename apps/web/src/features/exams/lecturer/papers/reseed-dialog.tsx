import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** Xác nhận "Bốc lại" (đổi `paper_seed` của bản nháp — exam-spec.md §3.5). */
export function ReseedDialog({ open, busy, onCancel, onConfirm }: { open: boolean; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <AlertDialog open={open} onOpenChange={(value) => !value && onCancel()}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Bốc lại bộ đề?</AlertDialogTitle>
        <AlertDialogDescription>
          Câu bốc ngẫu nhiên ở mọi đề sẽ được chọn lại. Câu cố định và quy tắc giữ nguyên. Bộ đề hiện tại không khôi phục được.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={busy}>Hủy</AlertDialogCancel>
        <AlertDialogAction disabled={busy} onClick={(event) => { event.preventDefault(); onConfirm(); }}>
          {busy ? "Đang bốc…" : "Bốc lại"}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
