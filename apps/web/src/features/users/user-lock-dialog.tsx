import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import type { User } from "@/types/api";

export function UserLockDialog({ user, onOpenChange, onDone }: { user: User | null; onOpenChange: (open: boolean) => void; onDone: () => void }) {
  const [reason, setReason] = useState(""); const [saving, setSaving] = useState(false);
  const locking = user?.status === "active";
  useEffect(() => setReason(""), [user?.id]);
  async function submit() {
    if (!user) return;
    if (locking && !reason.trim()) { toast.error("Hãy nhập lý do khóa tài khoản."); return; }
    setSaving(true);
    try {
      await api.patch(`/users/${user.id}`, locking ? { status: "locked", lock_reason: reason.trim() } : { status: "active" });
      toast.success(locking ? "Đã khóa tài khoản." : "Đã mở tài khoản."); onOpenChange(false); onDone();
    } catch (error) { toast.error(errorText(error)); } finally { setSaving(false); }
  }
  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{locking ? "Khóa tài khoản" : "Mở tài khoản"}</DialogTitle><DialogDescription>{user?.email}</DialogDescription></DialogHeader>
        {locking ? <div className="space-y-2"><Label htmlFor="lock-reason">Lý do khóa</Label><Textarea id="lock-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} placeholder="Nhập lý do để ghi vào nhật ký kiểm toán…" /></div> : <p className="text-sm">Tài khoản sẽ có thể đăng nhập lại sau khi được mở.</p>}
        <DialogFooter><Button variant="ghost" onClick={() => onOpenChange(false)}>Hủy</Button><Button variant={locking ? "destructive" : "default"} disabled={saving || (locking && !reason.trim())} onClick={submit}>{saving ? "Đang lưu…" : locking ? "Khóa tài khoản" : "Mở tài khoản"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
