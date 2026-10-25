import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Mail, Save, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import { useAuthStore } from "@/stores/auth";
import { useAvatarUrl } from "@/hooks/use-avatar-url";
import { ROLE_LABELS } from "@/components/role-status-badges";
import type { CurrentUser, LoginResponse } from "@/types/api";

export function ProfilePage() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  const setSession = useAuthStore((state) => state.setSession);
  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const profile = useQuery({ queryKey: ["me", "profile"], queryFn: () => api.get<CurrentUser>("/auth/me") });
  const user = profile.data;
  const avatarSrc = useAvatarUrl(user?.avatar_url);

  useEffect(() => {
    if (user) { setName(user.full_name); setPhone(user.phone ?? ""); }
  }, [user?.id]);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault(); if(!user?.email) return; setSaving(true);
    try {
      const result = await api.patch<CurrentUser>("/users/me", {
        full_name: name.trim(), phone: phone.trim(),
        ...(newPassword ? { old_password: oldPassword, new_password: newPassword } : {}),
      });
      queryClient.setQueryData(["me", "profile"], result); setUser(result);
      setOldPassword(""); setNewPassword("");
      if (newPassword) {
        const session=await api.post<LoginResponse>("/auth/login",{email:user.email,password:newPassword}); setSession(session);
      }
      toast.success("Đã cập nhật hồ sơ.");
    } catch (error) { toast.error(errorText(error)); } finally { setSaving(false); }
  }
  async function uploadAvatar(file?: File) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      toast.error("Chọn ảnh JPG, PNG hoặc WEBP có dung lượng tối đa 2MB."); return;
    }
    setAvatarBusy(true);
    const form = new FormData(); form.append("file", file);
    try {
      const result = await api.upload<CurrentUser>("/users/me/avatar", form);
      queryClient.setQueryData(["me", "profile"], result); setUser(result); toast.success("Đã cập nhật ảnh đại diện.");
    } catch (error) { toast.error(errorText(error)); } finally { setAvatarBusy(false); }
  }
  async function deleteAvatar() {
    setAvatarBusy(true);
    try {
      const result = await api.delete<CurrentUser>("/users/me/avatar");
      queryClient.setQueryData(["me", "profile"], result); setUser(result); toast.success("Đã xóa ảnh đại diện.");
    } catch (error) { toast.error(errorText(error)); } finally { setAvatarBusy(false); }
  }

  if (profile.isPending) return <p className="text-sm text-muted-foreground">Đang tải hồ sơ…</p>;
  if (!user) return <p className="text-sm text-destructive">Không tải được hồ sơ. Hãy thử tải lại trang.</p>;
  const initials = user.full_name.split(" ").filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase();
  return (
    <div className="space-y-6">
      <PageHeader title="Hồ sơ của tôi" description="Cập nhật thông tin liên hệ, ảnh đại diện và mật khẩu." />
      <div className="grid items-stretch gap-6 lg:grid-cols-[290px_minmax(0,1fr)]">
        <Card className="gap-0 pt-0">
          <div className="h-24 border-b bg-primary/10" />
          <CardContent className="space-y-5">
            <div className="-mt-12 space-y-3">
              <div className="grid size-24 place-items-center overflow-hidden rounded-2xl bg-accent text-2xl font-semibold text-primary ring-4 ring-card">
                {avatarSrc ? <img src={avatarSrc} alt="Ảnh đại diện" className="size-full object-cover" /> : initials}
              </div>
              <div><h2 className="break-words text-lg font-semibold">{user.full_name}</h2><p className="mt-1 break-all text-sm text-muted-foreground">{user.email}</p></div>
              <div className="flex flex-wrap gap-2">{user.roles.map((role) => <span key={role} className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">{ROLE_LABELS[role]}</span>)}</div>
            </div>
            <div className="space-y-3 border-t pt-5">
              <p className="text-sm font-medium">Ảnh đại diện</p>
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { void uploadAvatar(event.target.files?.[0]); event.target.value = ""; }} />
              <Button type="button" variant="outline" className="w-full" disabled={avatarBusy} onClick={() => fileInput.current?.click()}><Camera aria-hidden /> {avatarBusy ? "Đang cập nhật…" : "Thay đổi ảnh"}</Button>
              {user.avatar_url ? <Button type="button" variant="ghost" className="w-full text-muted-foreground" disabled={avatarBusy} onClick={deleteAvatar}><Trash2 aria-hidden /> Xóa ảnh hiện tại</Button> : null}
              <p className="text-xs leading-relaxed text-muted-foreground">Hỗ trợ JPG, PNG và WEBP.<br />Dung lượng tối đa 2MB.</p>
            </div>
            {user.student_code ? <div className="border-t pt-4 text-sm"><p className="text-xs text-muted-foreground">Mã sinh viên</p><p className="mt-1 font-medium">{user.student_code}</p></div> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-accent text-primary"><UserRound className="size-5" aria-hidden /></span><div><CardTitle>Thông tin cá nhân</CardTitle><CardDescription>Quản lý thông tin hiển thị và liên hệ của bạn.</CardDescription></div></div></CardHeader>
          <CardContent>
            <form onSubmit={saveProfile} className="space-y-7">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="profile-name">Họ và tên</Label><Input id="profile-name" autoComplete="name" required minLength={1} maxLength={150} value={name} onChange={(event) => setName(event.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="profile-phone">Số điện thoại</Label><Input id="profile-phone" type="tel" autoComplete="tel" maxLength={20} value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Nhập số điện thoại" /></div>
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="profile-email">Email đăng nhập</Label><div className="relative"><Mail className="absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden /><Input id="profile-email" value={user.email} readOnly className="bg-muted/50 pl-10 text-muted-foreground" /></div></div>
              </div>
              <section className="space-y-5 border-t pt-6" aria-labelledby="profile-security">
                <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden /><div><h2 id="profile-security" className="text-base font-semibold">Bảo mật tài khoản</h2><p className="mt-1 text-sm text-muted-foreground">Điền hai ô bên dưới khi bạn muốn đổi mật khẩu.</p></div></div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2"><Label htmlFor="old-password">Mật khẩu hiện tại</Label><Input id="old-password" type="password" autoComplete="current-password" placeholder="Nhập mật khẩu hiện tại" value={oldPassword} onChange={(event) => setOldPassword(event.target.value)} /></div>
                  <div className="space-y-2"><Label htmlFor="new-password">Mật khẩu mới</Label><Input id="new-password" type="password" autoComplete="new-password" placeholder="Tối thiểu 8 ký tự" minLength={8} maxLength={128} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></div>
                </div>
              </section>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5"><p className="text-xs text-muted-foreground">Kiểm tra thông tin trước khi lưu thay đổi.</p><Button type="submit" disabled={saving}><Save aria-hidden /> {saving ? "Đang lưu…" : "Lưu thay đổi"}</Button></div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
