"use client";

import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Scroll-reveal bằng IntersectionObserver + anime.js.
 * Gắn ref vào section; các phần tử con mang thuộc tính `data-reveal`
 * sẽ fade-up nhẹ theo stagger khi section vào viewport.
 * Nếu user bật prefers-reduced-motion → không ẩn, không animate.
 */
export function useReveal<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || prefersReducedMotion()) return;

    const targets = Array.from(
      root.querySelectorAll<HTMLElement>("[data-reveal]")
    );
    if (targets.length === 0) return;

    // Ẩn trước khi observe để tránh nhảy layout; SSR vẫn render nội dung đầy đủ
    targets.forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(12px)";
    });

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
          complete: () => {
            // Dọn inline style để không chặn transition/hover về sau
            targets.forEach((el) => {
              el.style.opacity = "";
              el.style.transform = "";
            });
          },
        });
      },
      { threshold: 0.2 }
    );

    io.observe(root);
    return () => io.disconnect();
  }, []);

  return ref;
}
