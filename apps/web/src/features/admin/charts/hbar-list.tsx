import { cn } from "@/lib/utils";
import { formatNumber } from "./chart-scale";

export interface HBarItem {
  key: string;
  label: string;
  /** Nhãn phụ (mã verdict…), chữ mono xám. */
  code?: string;
  value: number;
  /** Lớp `bg-*` của thanh. */
  barClass: string;
}

/**
 * Danh sách thanh ngang: nhãn · thanh (tỉ lệ theo giá trị lớn nhất) · số + %.
 * Giá trị luôn hiển thị bằng chữ nên không cần tooltip; `title` cho chuột.
 */
export function HBarList({ label, items, className }: { label: string; items: HBarItem[]; className?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const total = items.reduce((sum, i) => sum + i.value, 0);
  return (
    <ul aria-label={label} className={cn("space-y-1.5", className)}>
      {items.map((item) => {
        const percent = total ? (item.value / total) * 100 : 0;
        const text = `${item.label}: ${formatNumber(item.value)} (${formatNumber(percent, 1)}%)`;
        return (
          <li key={item.key} title={text} className="grid grid-cols-[minmax(0,9.5rem)_1fr_4.5rem] items-center gap-3 text-[13px] max-sm:grid-cols-[minmax(0,7.5rem)_1fr_4rem]">
            <span className="flex min-w-0 items-baseline gap-1.5">
              <span className="truncate">{item.label}</span>
              {item.code ? <span className="shrink-0 font-mono text-[11px] text-muted-foreground max-sm:hidden">{item.code}</span> : null}
            </span>
            <span className="h-2 rounded-full bg-secondary" aria-hidden>
              <span
                className={cn("block h-full rounded-full", item.value ? item.barClass : "bg-transparent")}
                style={{ width: `${item.value ? Math.max(2, (item.value / max) * 100) : 0}%` }}
              />
            </span>
            <span className="text-right tabular-nums">
              <span className="font-medium">{formatNumber(item.value)}</span>
              <span className="ml-1 text-xs text-muted-foreground">{formatNumber(percent, 0)}%</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
