import { useCallback, useEffect, useRef, useState } from "react";

/** Đo bề rộng phần tử bằng ResizeObserver (SVG vẽ đúng px, chữ không bị co giãn). */
export function useElementWidth<T extends HTMLElement>(fallback = 480) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    setWidth(node.clientWidth || fallback);
    const observer = new ResizeObserver((entries) => {
      const next = Math.round(entries[0]?.contentRect.width ?? 0);
      if (next > 0) setWidth(next);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [fallback]);
  return { ref, width };
}

/**
 * Cột đang trỏ của biểu đồ theo cột: chuột (di trong vùng vẽ) hoặc bàn phím
 * (focus vào SVG rồi ←/→/Home/End). Trả về props gắn lên `<svg>`.
 */
export function useChartCursor(count: number, plotLeft: number, step: number) {
  const [active, setActive] = useState<number | null>(null);
  const clamp = useCallback((i: number) => Math.max(0, Math.min(count - 1, i)), [count]);

  const onMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const index = Math.floor((event.clientX - box.left - plotLeft) / step);
    setActive(index >= 0 && index < count ? index : null);
  };
  const onKeyDown = (event: React.KeyboardEvent<SVGSVGElement>) => {
    const keys: Record<string, (i: number) => number> = {
      ArrowLeft: (i) => i - 1, ArrowRight: (i) => i + 1, Home: () => 0, End: () => count - 1,
    };
    const move = keys[event.key];
    if (!move) return;
    event.preventDefault();
    setActive((current) => clamp(move(current ?? count - 1)));
  };

  return {
    active,
    svgProps: {
      tabIndex: 0,
      onMouseMove,
      onMouseLeave: () => setActive(null),
      onFocus: () => setActive((current) => current ?? count - 1),
      onBlur: () => setActive(null),
      onKeyDown,
    },
  };
}
