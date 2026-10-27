/** Hàm thang đo dùng chung cho biểu đồ SVG tự vẽ (không thư viện). */

export const CHART_MARGIN = { top: 24, right: 8, bottom: 24, left: 36 } as const;

/** Bước chia "đẹp" (1, 2, 2.5, 5 × 10^n) gần nhất ≥ giá trị. */
function niceStep(raw: number, integer: boolean): number {
  const exp = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = ([1, 2, 2.5, 5, 10].find((s) => raw / exp <= s) ?? 10) * exp;
  return integer ? Math.max(1, Math.ceil(step)) : step;
}

/**
 * Thang trục y từ 0: chọn bước đẹp để có khoảng `target` vạch, trần = bội của bước.
 * `integer` cho số đếm (không có vạch lẻ như 0,5 bài).
 */
export function yScale(maxValue: number, { target = 4, integer = false } = {}): { max: number; ticks: number[] } {
  if (!Number.isFinite(maxValue) || maxValue <= 0) return { max: 1, ticks: [0, 1] };
  const step = niceStep(maxValue / target, integer);
  const count = Math.max(1, Math.ceil(maxValue / step - 1e-9));
  return { max: step * count, ticks: Array.from({ length: count + 1 }, (_, i) => step * i) };
}

/** Chỉ số nhãn trục x được hiển thị: cách đều, luôn giữ nhãn cuối. */
export function visibleLabelIndexes(total: number, plotWidth: number, minGap = 46): Set<number> {
  const maxLabels = Math.max(1, Math.floor(plotWidth / minGap));
  const every = Math.max(1, Math.ceil(total / maxLabels));
  const result = new Set<number>();
  for (let i = total - 1; i >= 0; i -= every) result.add(i);
  return result;
}

/** Hình chữ nhật bo 2 góc trên (đầu dữ liệu), đáy vuông bám trục. */
export function topRoundedRect(x: number, y: number, w: number, h: number, r = 3): string {
  const rr = Math.max(0, Math.min(r, h, w / 2));
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

export function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString("vi-VN", { maximumFractionDigits: digits });
}
