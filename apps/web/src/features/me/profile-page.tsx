import { useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import type { SelfUserView } from "@/types/api";
import { ProfileAvatarSection } from "./profile-avatar-section";
import { ProfilePasswordForm } from "./profile-password-form";
import { useRefreshMe } from "./use-refresh-me";

/** Form sửa họ tên + SĐT; MSV/email chỉ xem */
function ProfileInfoForm() {
  const { user } = useAuthGuard();
  const refreshMe = useRefreshMe();
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!fullName.trim()) {
      setError("Vui lòng nhập họ và tên.");
      return;
    }
    setBusy(true);
    try {
      await api.patch<SelfUserView>("/users/me", {
        full_name: fullName.trim(),
        phone: phone.trim() || null,
      });
      await refreshMe();
      toast.success("Đã lưu thông tin cá nhân.");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Thông tin cá nhân</CardTitle>
        <CardDescription>Mã sinh viên và email do trường cấp, không thể tự sửa.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="max-w-md space-y-4">
          {user?.student_code ? (
            <div className="space-y-2">
              <Label htmlFor="student-code">Mã sinh viên</Label>
              <Input id="student-code" value={user.student_code} readOnly className="font-mono" />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email ?? ""} readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="full-name">Họ và tên</Label>
            <Input
              id="full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              maxLength={150}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Số điện thoại</Label>
            <Input
              id="phone"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={20}
              placeholder="Nhập số điện thoại của bạn"
            />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={busy}>
            <Save aria-hidden />
            {busy ? "Đang lưu…" : "Lưu thay đổi"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/** Trang hồ sơ (/me/profile) — mọi role; avatar + thông tin + đổi mật khẩu */
export function ProfilePage() {
  const { status: guard, user } = useAuthGuard();
  if (guard !== "ok") return null;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">Hồ sơ</h2>
        <p className="text-sm text-muted-foreground">Quản lý thông tin cá nhân và bảo mật tài khoản.</p>
      </div>
      <ProfileAvatarSection fullName={user?.full_name} avatarUrl={user?.avatar_url} />
      <ProfileInfoForm />
      <ProfilePasswordForm />
    </div>
  );
}
