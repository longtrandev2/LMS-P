import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { AnnouncementAudience } from "@/types/admin";
import { audienceText } from "./operations-labels";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onConfirm: () => void;
  title: string;
  audience: AnnouncementAudience;
  role: string;
  classCode: string | null;
}

/** Xác nhận gửi: nhắc lại tiêu đề và người nhận, vì thông báo không thu hồi được. */
export function AnnouncementConfirmDialog({ open, onOpenChange, pending, onConfirm, title, audience, role, classCode }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gửi thông báo hệ thống?</DialogTitle>
          <DialogDescription>Người nhận thấy ngay trong chuông thông báo. Thông báo đã gửi không thu hồi được.</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-2 rounded-lg bg-secondary/60 px-3 py-2.5 text-sm">
          <dt className="text-muted-foreground">Tiêu đề</dt>
          <dd className="font-medium break-words">{title}</dd>
          <dt className="text-muted-foreground">Người nhận</dt>
          <dd className="flex items-center gap-1.5 font-medium">
            <Users className="size-4 text-muted-foreground" aria-hidden />
            {audienceText(audience, role, classCode)}
          </dd>
        </dl>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Quay lại</Button>
          <Button type="button" disabled={pending} onClick={onConfirm}>{pending ? "Đang gửi…" : "Gửi thông báo"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
