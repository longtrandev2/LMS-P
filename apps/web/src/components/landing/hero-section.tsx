"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { animate, stagger } from "animejs";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardMockup } from "@/components/landing/dashboard-mockup";

interface HeroSectionProps {
  ctaHref: string;
  ctaLabel: string;
}

/** Hero — stagger fade-up nhẹ (translateY 12px) khi mount, tôn trọng reduced-motion */
export function HeroSection({ ctaHref, ctaLabel }: HeroSectionProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const targets = Array.from(
      root.querySelectorAll<HTMLElement>("[data-hero]")
    );
    if (targets.length === 0) return;

    animate(targets, {
      opacity: [0, 1],
      translateY: [12, 0],
      duration: 500,
      delay: stagger(70),
      ease: "out(3)",
    });
  }, []);

  return (
    <section className="border-b border-border">
      <div
        ref={rootRef}
        className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-16 md:py-24 lg:grid-cols-[1.1fr_1fr]"
      >
        <div className="flex flex-col items-start gap-5">
          <h1
            data-hero
            className="text-3xl leading-tight font-semibold tracking-tight text-balance md:text-4xl"
          >
            Lớp học phần, học liệu, bài tập, kỳ thi và chấm bài lập trình tự
            động — trên một hệ thống
          </h1>

          <p
            data-hero
            className="max-w-lg text-base leading-relaxed text-muted-foreground"
          >
            Sinh viên nộp bài viết bằng Python, C, C++ hoặc Java và nhận kết
            quả chấm từng test gần như ngay lập tức. Giảng viên quản lý toàn bộ
            lớp học phần, từ học liệu đến sổ điểm.
          </p>

          <div data-hero className="flex flex-wrap items-center gap-3">
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
            <Button asChild variant="outline" size="lg">
              <a href="#tinh-nang">Xem năng lực hệ thống</a>
            </Button>
          </div>

          <p
            data-hero
            className="text-sm text-muted-foreground"
          >
            Tài khoản do quản trị cấp · Sinh viên — Giảng viên — Quản trị
          </p>
        </div>

        <div data-hero className="lg:justify-self-end lg:w-full">
          <DashboardMockup />
        </div>
      </div>
    </section>
  );
}
