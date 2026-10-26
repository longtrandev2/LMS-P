import type { ReactNode } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** Hộp xác nhận ngắn (nộp lượt cuối, khôi phục code mẫu…). */
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, onConfirm, destructive = false }: {
  open: boolean; onOpenChange: (open: boolean) => void; title: string; description: ReactNode;
  confirmLabel: string; onConfirm: () => void; destructive?: boolean;
}) {
  return <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Hủy</AlertDialogCancel>
        <AlertDialogAction variant={destructive ? "destructive" : "cta"} onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
