import { Link } from "react-router-dom";
import { LoginForm } from "@/features/auth/login-form";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { DeadlinesFragment, SubmissionFragment } from "@/components/landing/product-fragments";

/**
 * Đăng nhập 2 cột: trái form gọn (CTA đỏ), phải panel đơn sắc đảo màu mô tả hệ thống bằng
 * mảnh giao diện thật. Panel ẩn dưới `lg`.
 */
export function LoginPage() {
  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-2">
      <section className="flex flex-col px-4 py-5 sm:px-8">
        <div className="flex items-center justify-between">
          <Link to="/" aria-label="LMS-P — trang chủ" className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Logo size={24} />
          </Link>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">
            <LoginForm />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Tài khoản do quản trị viên của khoa cấp.</p>
      </section>

      <section aria-label="Giới thiệu hệ thống" className="hidden flex-col justify-center gap-10 bg-foreground p-12 text-background lg:flex xl:p-16">
        <div className="max-w-md space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight text-balance">
            Bài tập, quiz và kết quả chấm code của mọi lớp ở một chỗ.
          </h2>
          <p className="text-sm text-background/70">
            Xem bài sắp đến hạn, nộp bài lập trình và nhận kết quả từng test ngay khi chấm xong.
          </p>
        </div>
        <div className="grid max-w-md gap-3">
          <DeadlinesFragment className="border-background/10" />
          <SubmissionFragment className="ml-8 border-background/10" />
        </div>
      </section>
    </div>
  );
}
