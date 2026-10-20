"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { animate, stagger } from "animejs";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

const FOOTER_LINKS: { label: string; href: string }[] = [
  { label: "Năng lực hệ thống", href: "#tinh-nang" },
  { label: "Lớp học phần", href: "#lop-hoc-phan" },
  { label: "Vai trò", href: "#vai-tro" },
  { label: "Đăng nhập", href: "/login" },
];

interface LandingFooterProps {
  ctaHref: string;
  ctaLabel: string;
}

/** CTA cuối trang + footer tối giản — chỉ nghiệp vụ, không công nghệ */
export function LandingFooter({ ctaHref, ctaLabel }: LandingFooterProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const targets = Array.from(
      root.querySelectorAll<HTMLElement>("[data-reveal]")
    );
    if (targets.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        io.disconnect();
        animate(targets, {
          opacity: [0, 1],
          translateY: [12, 0],
          duration: 500,
          delay: stagger(60),
          ease: "out(3)",
          complete: () =>
            targets.forEach((el) => {
              el.style.opacity = "";
              el.style.transform = "";
            }),
        });
      },
      { threshold: 0.2 }
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  return (
    <footer ref={ref} className="border-t border-border">
      {/* CTA cuối */}
      <div className="mx-auto w-full max-w-6xl px-6 py-16 text-center md:py-20">
        <h2
          data-reveal
          className="mx-auto max-w-xl text-2xl font-semibold tracking-tight text-balance md:text-3xl"
        >
          Sẵn sàng cho học kỳ mới?
        </h2>
        <p
          data-reveal
          className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground"
        >
          Đăng nhập bằng tài khoản được cấp để vào lớp học phần, nộp bài tập
          lập trình và nhận kết quả chấm ngay khi hệ thống xử lý xong.
        </p>
        <div data-reveal className="mt-6">
          <Button
            asChild
            size="lg"
            className="bg-(--gold) text-white hover:bg-(--gold)/90"
          >
            <Link href={ctaHref}>
              {ctaLabel}
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3">
            <Logo size={28} />
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Nền tảng quản lý học tập — từ lớp học
              phần đến kết quả chấm bài.
            </p>
          </div>

          <nav aria-label="Liên kết chân trang">
            <ul className="flex flex-wrap gap-x-8 gap-y-3">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="border-t border-border">
          <div className="mx-auto flex w-full max-w-6xl px-6 py-5">
            <p className="text-xs text-muted-foreground">© 2026 LMS-P</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
