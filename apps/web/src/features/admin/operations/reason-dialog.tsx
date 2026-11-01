import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  pending: boolean;
  onConfirm: (reason: string) => void;
}

/** Hộp xác nhận thao tác vận hành, bắt buộc nhập lý do (ghi audit) — admin-spec §4. */
export function ReasonDialog({ open, onOpenChange, title, description, confirmLabel, destructive, pending, onConfirm }: ReasonDialogProps) {
  const [reason, setReason] = useState("");
  useEffect(() => { if (open) setReason(""); }, [open]);
  const ok = reason.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form id="reason-form" className="space-y-1.5" onSubmit={(event) => { event.preventDefault(); if (ok) onConfirm(reason.trim()); }}>
          <Label htmlFor="ops-reason">Lý do</Label>
          <Textarea id="ops-reason" rows={3} maxLength={500} value={reason} required autoFocus
            onChange={(event) => setReason(event.target.value)} placeholder="Bắt buộc — ghi vào nhật ký kiểm toán" />
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button type="submit" form="reason-form" variant={destructive ? "destructive" : "default"} disabled={!ok || pending}>
            {pending ? "Đang xử lý…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
