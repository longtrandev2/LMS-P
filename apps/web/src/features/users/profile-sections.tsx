import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import { useAuthStore } from "@/stores/auth";
import type { CurrentUser, LoginResponse } from "@/types/api";

/** Section kiểu settings: tiêu đề 16/600 + mô tả xám, field lưới 2 cột, nút "Lưu" đen ở cuối. */
function Section({ id, title, description, children, onSubmit, saving, canSave = true }: {
  id: string; title: string; description: string; children: React.ReactNode;
  onSubmit: () => void; saving: boolean; canSave?: boolean;
}) {
  return (
    <form
      aria-labelledby={id}
      onSubmit={(event) => { event.preventDefault(); onSubmit(); }}
      className="space-y-5 border-t pt-8 first:border-t-0 first:pt-0"
    >
      <div className="space-y-1">
        <h2 id={id} className="text-base font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">{children}</div>
      <Button type="submit" disabled={saving || !canSave}>{saving ? "Đang lưu…" : "Lưu"}</Button>
    </form>
  );
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function ProfileInfoSection({ user, onSaved }: { user: CurrentUser; onSaved: (user: CurrentUser) => void }) {
  const [name, setName] = useState(user.full_name);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try {
      onSaved(await api.patch<CurrentUser>("/users/me", { full_name: name.trim(), phone: phone.trim() }));
      toast.success("Đã cập nhật hồ sơ.");
    } catch (error) { toast.error(errorText(error)); } finally { setSaving(false); }
  }
  return (
    <Section id="profile-info" title="Thông tin cá nhân" description="Tên hiển thị với giảng viên, sinh viên trong lớp và số điện thoại liên hệ."
      onSubmit={save} saving={saving} canSave={name.trim().length > 0}>
      <Field id="profile-name" label="Họ và tên">
        <Input id="profile-name" autoComplete="name" required maxLength={150} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field id="profile-phone" label="Số điện thoại">
        <Input id="profile-phone" type="tel" autoComplete="tel" maxLength={20} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Chưa có" />
      </Field>
      <Field id="profile-email" label="Email đăng nhập" hint="Liên hệ quản trị viên nếu cần đổi email.">
        <Input id="profile-email" value={user.email} readOnly className="text-muted-foreground hover:bg-secondary" />
      </Field>
    </Section>
  );
}

export function ProfilePasswordSection({ user, onSaved }: { user: CurrentUser; onSaved: (user: CurrentUser) => void }) {
  const setSession = useAuthStore((state) => state.setSession);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try {
      const result = await api.patch<CurrentUser>("/users/me", {
        full_name: user.full_name, phone: (user.phone ?? "").trim(), old_password: oldPassword, new_password: newPassword,
      });
      onSaved(result); setOldPassword(""); setNewPassword("");
      setSession(await api.post<LoginResponse>("/auth/login", { email: user.email, password: newPassword }));
      toast.success("Đã đổi mật khẩu.");
    } catch (error) { toast.error(errorText(error)); } finally { setSaving(false); }
  }
  return (
    <Section id="profile-password" title="Đổi mật khẩu" description="Sau khi đổi, các phiên đăng nhập khác sẽ bị đăng xuất."
      onSubmit={save} saving={saving} canSave={!!oldPassword && newPassword.length >= 8}>
      <Field id="old-password" label="Mật khẩu hiện tại">
        <Input id="old-password" type="password" autoComplete="current-password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
      </Field>
      <Field id="new-password" label="Mật khẩu mới" hint="Tối thiểu 8 ký tự.">
        <Input id="new-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
      </Field>
    </Section>
  );
}
