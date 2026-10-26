import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Logo } from "@/components/logo";

interface LandingHeaderProps {
  ctaHref: string;
  ctaLabel: string;
  loggedIn: boolean;
}

/** Header landing — logo, đổi theme, đăng nhập / vào hệ thống. */
export function LandingHeader({ ctaHref, ctaLabel, loggedIn }: LandingHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" aria-label="LMS-P — trang chủ" className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Logo size={24} />
        </Link>
        <nav aria-label="Điều hướng trang chủ" className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#hoc-lieu" className="transition-colors hover:text-foreground">Học liệu & lớp</a>
          <a href="#bai-tap" className="transition-colors hover:text-foreground">Bài tập & quiz</a>
          <a href="#cham-code" className="transition-colors hover:text-foreground">Chấm code</a>
        </nav>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          {loggedIn ? null : <Button asChild variant="ghost" size="sm"><Link to="/login">Đăng nhập</Link></Button>}
          <Button asChild size="sm"><Link to={ctaHref}>{ctaLabel}</Link></Button>
        </div>
      </div>
    </header>
  );
}
