import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

interface LandingFooterProps {
  ctaHref: string;
  ctaLabel: string;
}

/** Chân trang — lời mời ngắn + thông tin tài khoản do quản trị cấp. */
export function LandingFooter({ ctaHref, ctaLabel }: LandingFooterProps) {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-base font-semibold">Bắt đầu với lớp của bạn</p>
          <p className="text-sm text-muted-foreground">Tài khoản do quản trị viên của khoa cấp cho sinh viên và giảng viên.</p>
        </div>
        <Button asChild><Link to={ctaHref}>{ctaLabel}</Link></Button>
      </div>
      <div className="border-t">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 text-xs text-muted-foreground sm:px-6">
          <Logo size={18} />
          <span>Đồ án môn Lập trình mạng</span>
        </div>
      </div>
    </footer>
  );
}
