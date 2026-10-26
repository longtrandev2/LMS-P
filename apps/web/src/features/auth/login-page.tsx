import { LoginForm } from "@/features/auth/login-form";
import { LogoMark } from "@/components/logo";

/** Đăng nhập kiểu Frappe: nền xám nhạt, một khối form gọn giữa màn hình, không panel minh họa. */
export function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-sidebar px-4 py-10">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <LogoMark size={40} />
        <div>
          <h1 className="text-xl font-semibold">Đăng nhập vào LMS-P</h1>
          <p className="mt-1 text-sm text-muted-foreground">Lập trình mạng · Hệ thống học tập</p>
        </div>
      </div>
      <div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-md">
        <LoginForm />
      </div>
      <p className="mt-6 text-xs text-muted-foreground">Tài khoản do quản trị viên của khoa cấp.</p>
    </div>
  );
}
