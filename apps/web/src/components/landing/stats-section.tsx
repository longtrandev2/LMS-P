"use client";

import { useEffect, useRef } from "react";
import { animate } from "animejs";
import { useReveal } from "@/lib/hooks/use-reveal";

interface Stat {
  value: number;
  suffix: string;
  label: string;
}

/** Số liệu đối chiếu spec: 4 ngôn ngữ, 3 vai trò, realtime WS, CCU + queue */
const STATS: Stat[] = [
  {
    value: 4,
    suffix: "",
    label: "Ngôn ngữ lập trình được chấm tự động",
  },
  {
    value: 3,
    suffix: "",
    label: "Vai trò với phân quyền RBAC",
  },
  {
    value: 100,
    suffix: "%",
    label: "Kết quả chấm trả về realtime qua WebSocket",
  },
  {
    value: 300,
    suffix: "+",
    label: "Người dùng đồng thời — hàng đợi RabbitMQ hấp thụ giờ cao điểm",
  },
];

/** Stats counter — đếm số bằng anime.js khi vào viewport */
export function StatsSection() {
  const sectionRef = useReveal<HTMLElement>();
  const countersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = countersRef.current;
    if (!root) return;

    const counters = Array.from(
      root.querySelectorAll<HTMLElement>("[data-counter]")
    );

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        io.disconnect();
        counters.forEach((el) => {
          const target = Number(el.dataset.counter ?? "0");
          const state = { value: 0 };
          el.textContent = "0";
          animate(state, {
            value: target,
            duration: 1400,
            ease: "out(3)",
            onUpdate: () => {
              el.textContent = String(Math.round(state.value));
            },
            complete: () => {
              el.textContent = String(target);
            },
          });
        });
      },
      { threshold: 0.4 }
    );

    io.observe(root);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-20 md:py-24">
      <div className="mx-auto w-full max-w-6xl px-6">
        <div
          ref={countersRef}
          className="grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4"
        >
          {STATS.map((stat) => (
            <div
              key={stat.label}
              data-reveal
              className="flex flex-col gap-2 bg-background p-8"
            >
              <p className="font-heading text-4xl font-bold tabular-nums text-card-foreground">
                <span data-counter={stat.value}>{stat.value}</span>
                <span className="text-gold">{stat.suffix}</span>
              </p>
              <p className="text-sm leading-snug text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
