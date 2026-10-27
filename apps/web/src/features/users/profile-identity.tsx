import { useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/components/role-status-badges";
import { useAvatarUrl } from "@/hooks/use-avatar-url";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import type { CurrentUser } from "@/types/api";
import { UserAvatar } from "@/features/users/user-avatar";

/** Cột trái trang hồ sơ: avatar, tên, vai trò, đổi/xóa ảnh — không khung, kiểu trang settings của Frappe. */
export function ProfileIdentity({ user, onUpdated }: { user: CurrentUser; onUpdated: (user: CurrentUser) => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const avatarSrc = useAvatarUrl(user.avatar_url);

  async function upload(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) {
      toast.error("Chọn ảnh JPG, PNG hoặc WEBP có dung lượng tối đa 2MB."); return;
    }
    setBusy(true);
    const form = new FormData(); form.append("file", file);
    try {
      onUpdated(await api.upload<CurrentUser>("/users/me/avatar", form)); toast.success("Đã cập nhật ảnh đại diện.");
    } catch (error) { toast.error(errorText(error)); } finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true);
    try {
      onUpdated(await api.delete<CurrentUser>("/users/me/avatar")); toast.success("Đã xóa ảnh đại diện.");
    } catch (error) { toast.error(errorText(error)); } finally { setBusy(false); }
  }

  return (
    <aside className="space-y-5">
      <UserAvatar name={user.full_name} src={avatarSrc} size="xl" />
      <div className="space-y-1">
        <h2 className="text-base font-semibold break-words">{user.full_name}</h2>
        <p className="text-sm break-all text-muted-foreground">{user.email}</p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {user.roles.map((role) => <Badge key={role}>{ROLE_LABELS[role]}</Badge>)}
        </div>
      </div>
      <div className="space-y-2">
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Chọn ảnh đại diện"
          onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ""; }} />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => fileInput.current?.click()}>
            {busy ? "Đang cập nhật…" : "Đổi ảnh"}
          </Button>
          {user.avatar_url ? (
            <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" disabled={busy} onClick={remove}>Xóa ảnh</Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">JPG, PNG hoặc WEBP, tối đa 2MB.</p>
      </div>
      {user.student_code ? (
        <dl className="space-y-1 border-t pt-4 text-sm">
          <dt className="text-xs text-muted-foreground">Mã sinh viên</dt>
          <dd className="font-mono">{user.student_code}</dd>
        </dl>
      ) : null}
    </aside>
  );
}
