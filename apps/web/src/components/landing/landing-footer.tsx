"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { animate, stagger } from "animejs";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

const FOOTER_LINKS: { title: string; links: { label: string; href: string }[] }[] =
  [
    {
      title: "Hệ thống",
      links: [
        { label: "Tính năng", href: "#tinh-nang" },
        { label: "Lớp học phần", href: "#lop-hoc-phan" },
        { label: "Vai trò", href: "#vai-tro" },
      ],
    },
    {
      title: "Tài khoản",
      links: [{ label: "Đăng nhập", href: "/login" }],
    },
  ];

interface LandingFooterProps {
  ctaHref: string;
  ctaLabel: string;
}

/** CTA cuối trang + footer tối giản kiểu cổng đào tạo */
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
          translateY: [24, 0],
          duration: 700,
          delay: stagger(90),
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
      <div className="bg-primary text-primary-foreground">
        <div
          data-reveal
          className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-6 py-16 text-center md:py-20"
        >
          <h2 className="max-w-2xl font-heading text-3xl font-semibold tracking-tight text-balance md:text-4xl">
            Sẵn sàng cho học kỳ mới?
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-primary-foreground/75">
            Đăng nhập bằng tài khoản được cấp để vào lớp học phần, nộp bài tập
            lập trình và nhận kết quả chấm ngay khi hệ thống xử lý xong.
          </p>
          <Button asChild size="lg" variant="secondary">
            <Link href={ctaHref}>
              {ctaLabel}
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-12 md:grid-cols-[1fr_auto_auto]">
        <div className="flex flex-col gap-3">
          <Logo size={32} />
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            Nền tảng quản trị học tập cho lớp học hiện đại — Next.js · FastAPI ·
            MySQL · RabbitMQ.
          </p>
        </div>

        {FOOTER_LINKS.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-muted-foreground">
              {group.title}
            </p>
            <ul className="mt-4 flex flex-col gap-2.5">
              {group.links.map((link) => (
                <li key={link.label}>
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
        ))}
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-6 py-5 text-xs text-muted-foreground sm:flex-row">
          <p>© 2026 LMS-P</p>
          <p>Hỗ trợ: liên hệ quản trị hệ thống của khóa học</p>
        </div>
      </div>
    </footer>
  );
}
