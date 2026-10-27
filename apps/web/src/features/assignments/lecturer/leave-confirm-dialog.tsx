import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** Hỏi lại trước khi rời trang soạn đề khi còn thay đổi chưa lưu. */
export function LeaveConfirmDialog({ open, onCancel, onConfirm }: { open: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <AlertDialog open={open} onOpenChange={(value) => !value && onCancel()}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Rời trang khi chưa lưu?</AlertDialogTitle>
        <AlertDialogDescription>Các thay đổi trên đề sẽ mất. Chọn "Ở lại" rồi bấm Lưu nháp nếu muốn giữ.</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Ở lại</AlertDialogCancel>
        <AlertDialogAction variant="destructive" onClick={onConfirm}>Bỏ thay đổi</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
