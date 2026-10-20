"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TempPasswordReveal } from "@/components/users/temp-password-reveal";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import type { User } from "@/types/api";

interface ResetPasswordDialogProps {
  user: User | null;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}

/** PATCH /users/{id} {reset_password:true} → {temporary_password} — hiện 1 lần */
export function ResetPasswordDialog({ user, onOpenChange, onDone }: ResetPasswordDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const open = !!user;

  async function handleReset() {
    if (!user) return;
    setSubmitting(true);
    try {
      const data = await api.patch<{ temporary_password: string }>(`/users/${user.id}`, {
        reset_password: true,
      });
      setTempPassword(data.temporary_password);
      onDone();
    } catch (error) {
      toast.error(errorText(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setTempPassword(null); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Đặt lại mật khẩu</DialogTitle>
          <DialogDescription>
            {tempPassword
              ? "Mật khẩu tạm chỉ hiển thị một lần — hãy giao cho người dùng ngay."
              : `Đặt lại mật khẩu cho ${user?.full_name} (${user?.email}).`}
          </DialogDescription>
        </DialogHeader>

        {tempPassword ? (
          <div className="space-y-3">
            <TempPasswordReveal password={tempPassword} />
            <p className="text-xs text-muted-foreground">
              Người dùng nên đổi mật khẩu ngay khi đăng nhập lần đầu.
            </p>
          </div>
        ) : (
          <p className="flex items-start gap-2 rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
            <KeyRound className="mt-0.5 size-4 shrink-0" aria-hidden />
            Hệ thống sẽ sinh mật khẩu tạm và hiển thị đúng một lần duy nhất.
          </p>
        )}

        <DialogFooter>
          {tempPassword ? (
            <Button type="button" onClick={() => onOpenChange(false)}>
              Hoàn tất
            </Button>
          ) : (
            <>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Hủy
              </Button>
              <Button type="button" variant="destructive" onClick={handleReset} disabled={submitting}>
                {submitting ? "Đang đặt lại…" : "Đặt lại mật khẩu"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
