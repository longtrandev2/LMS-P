"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

const NAV_LINKS = [
  { href: "#tinh-nang", label: "Tính năng" },
  { href: "#lop-hoc-phan", label: "Lớp học phần" },
  { href: "#vai-tro", label: "Vai trò" },
];

interface LandingHeaderProps {
  ctaHref: string;
  ctaLabel: string;
}

/** Header sticky — trong suốt lúc đầu, glass/blur + viền khi scroll */
export function LandingHeader({ ctaHref, ctaLabel }: LandingHeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-[background-color,border-color,box-shadow] duration-300",
        scrolled
          ? "border-b border-border bg-background/80 shadow-sm backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-6">
        <Link href="/" aria-label="LMS-P — trang chủ" className="flex items-center gap-2.5">
          <Logo size={32} />
        </Link>

        <nav aria-label="Điều hướng trang chủ" className="hidden md:block">
          <ul className="flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-xs font-semibold tracking-widest uppercase text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Đăng nhập</Link>
          </Button>
          <Button asChild size="sm">
            <Link href={ctaHref}>{ctaLabel}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
