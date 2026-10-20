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

/** Hero — stagger fade-up chữ + visual khi mount (anime.js) */
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
      translateY: [28, 0],
      duration: 800,
      delay: stagger(110),
      ease: "out(3)",
    });
  }, []);

  return (
    <section className="relative overflow-hidden">
      {/* Họa tiết nền: đường kẻ dọc kiểu vở học thuật */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 mx-auto hidden w-full max-w-6xl grid-cols-4 px-6 lg:grid"
      >
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="border-l border-border/60" />
        ))}
      </div>

      <div
        ref={rootRef}
        className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-16 md:py-24 lg:grid-cols-2"
      >
        <div className="flex flex-col items-start gap-6">
          <p
            data-hero
            className="border border-border bg-card px-3 py-1.5 text-[11px] font-semibold tracking-widest uppercase text-muted-foreground"
          >
            Hệ thống đào tạo trực tuyến
          </p>

          <h1
            data-hero
            className="font-heading text-4xl leading-tight font-semibold tracking-tight text-balance md:text-5xl"
          >
            Lớp học phần, kỳ thi và chấm điểm tự động —{" "}
            <span className="text-gold">trên một cổng duy nhất</span>
          </h1>

          <p
            data-hero
            className="max-w-lg text-base leading-relaxed text-muted-foreground"
          >
            LMS-P là hệ thống quản lý học tập dành cho môn Lập trình mạng:
            giảng viên tổ chức lớp, học liệu và ngân hàng đề; sinh viên làm bài
            trực tuyến; bài nộp lập trình được chấm tự động trong sandbox
            Docker và trả kết quả realtime qua WebSocket.
          </p>

          <div data-hero className="flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href={ctaHref}>
                {ctaLabel}
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="#tinh-nang">Khám phá tính năng</a>
            </Button>
          </div>

          <p
            data-hero
            className="text-xs tracking-wide text-muted-foreground"
          >
            Tài khoản do quản trị cấp · Sinh viên — Giảng viên — Quản trị
          </p>
        </div>

        <div data-hero className="lg:justify-self-end lg:w-full lg:max-w-md">
          <DashboardMockup />
        </div>
      </div>
    </section>
  );
}
