import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TempPasswordReveal } from "@/features/users/temp-password-reveal";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import type { Role, User, UserWithTempPassword } from "@/types/api";
import { UserRoleSelector } from "@/features/users/user-role-selector";
import { FieldError } from "@/components/form-field-error";

interface UserFormDialogProps {
  onOpenChange: (open: boolean) => void;
  /** null = tạo mới */
  user: User | null;
  onSaved: () => void;
}

/**
 * Khởi tạo state từ props — component được mount có điều kiện kèm `key`
 * (xem users-page.tsx) nên không cần sync state bằng effect.
 */
export function UserFormDialog({ onOpenChange, user, onSaved }: UserFormDialogProps) {
  const isEdit = !!user;
  const [email, setEmail] = useState(user?.email ?? "");
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [studentCode, setStudentCode] = useState(user?.student_code ?? "");
  const [roles, setRoles] = useState<Role[]>(user?.roles?.length ? user.roles : ["student"]);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  /** Mật khẩu tạm từ POST /users — hiển thị 1 lần rồi mới đóng dialog */
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Email không hợp lệ.";
    if (fullName.trim().length < 2) next.fullName = "Họ tên tối thiểu 2 ký tự.";
    if (roles.length === 0) next.roles = "Chọn ít nhất một vai trò.";
    if (roles.includes("student") && !studentCode.trim())
      next.studentCode = "Sinh viên cần mã số.";
    if (!isEdit && password && password.length < 8)
      next.password = "Mật khẩu tối thiểu 8 ký tự.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (isEdit) {
        // UserUpdateIn BE không nhận student_code — chỉ gửi field hợp lệ
        await api.patch(`/users/${user.id}`, {
          full_name: fullName.trim(),
          student_code: studentCode.trim() || null,
          role_names: roles,
        });
        toast.success("Đã cập nhật người dùng.");
        onOpenChange(false);
        onSaved();
      } else {
        const data = await api.post<UserWithTempPassword>("/users", {
          email: email.trim(),
          full_name: fullName.trim(),
          student_code: studentCode.trim() || null,
          role_names: roles,
          ...(password ? { password } : {}),
        });
        onSaved();
        if (data.temporary_password) {
          setTempPassword(data.temporary_password);
        } else {
          toast.success("Đã tạo người dùng mới.");
          onOpenChange(false);
        }
      }
    } catch (error) {
      toast.error(errorText(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {isEdit ? "Sửa người dùng" : "Tạo người dùng"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Cập nhật thông tin và vai trò của tài khoản."
              : "Tài khoản mới sẽ nhận mật khẩu tạm nếu không nhập mật khẩu."}
          </DialogDescription>
        </DialogHeader>

        {tempPassword ? (
          <div className="space-y-3">
            <p className="text-sm">
              Đã tạo người dùng <span className="font-medium">{email}</span>. Mật khẩu tạm chỉ
              hiển thị một lần — hãy giao cho người dùng ngay:
            </p>
            <TempPasswordReveal password={tempPassword} />
            <DialogFooter>
              <Button type="button" onClick={() => onOpenChange(false)}>
                Hoàn tất
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isEdit}
                aria-invalid={!!errors.email}
                placeholder="ten@truong.edu.vn"
              />
              {errors.email ? <FieldError text={errors.email} /> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-name">Họ và tên</Label>
              <Input
                id="user-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                aria-invalid={!!errors.fullName}
              />
              {errors.fullName ? <FieldError text={errors.fullName} /> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-code">
                Mã số sinh viên{" "}
                {isEdit ? <span className="text-muted-foreground">(để trống để xóa mã)</span> : null}
              </Label>
              <Input
                id="user-code"
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value)}
                className="font-mono"
                placeholder="VD: 21DH110123"
                aria-invalid={!!errors.studentCode}
              />
              {errors.studentCode ? <FieldError text={errors.studentCode} /> : null}
            </div>
            <UserRoleSelector roles={roles} onChange={setRoles} error={errors.roles} />
            {!isEdit ? (
              <div className="space-y-2">
                <Label htmlFor="user-password">
                  Mật khẩu <span className="text-muted-foreground">(để trống = hệ thống sinh tạm)</span>
                </Label>
                <Input
                  id="user-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!errors.password}
                />
                {errors.password ? <FieldError text={errors.password} /> : null}
              </div>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Đang lưu…" : isEdit ? "Lưu thay đổi" : "Tạo người dùng"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
