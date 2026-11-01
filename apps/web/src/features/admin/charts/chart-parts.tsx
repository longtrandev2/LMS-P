import { cn } from "@/lib/utils";
import { CHART_MARGIN, formatNumber } from "./chart-scale";

/** Mẫu nhận diện chuỗi: ô vuông (cột) hoặc đoạn thẳng (đường, có thể nét đứt). */
export interface SeriesSwatch { kind: "box" | "line"; className: string; dashed?: boolean }

export function Swatch({ swatch }: { swatch: SeriesSwatch }) {
  if (swatch.kind === "box") return <span aria-hidden className={cn("inline-block size-2.5 shrink-0 rounded-[3px]", swatch.className)} />;
  return (
    <svg aria-hidden width="16" height="8" className="shrink-0">
      <line x1="1" y1="4" x2="15" y2="4" strokeWidth="2" strokeLinecap="round" strokeDasharray={swatch.dashed ? "3 3" : undefined} className={swatch.className} />
    </svg>
  );
}

export function ChartLegend({ items }: { items: { key: string; label: string; swatch: SeriesSwatch }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-1.5"><Swatch swatch={item.swatch} />{item.label}</li>
      ))}
    </ul>
  );
}

export interface TooltipRow { key: string; label: string; value: string; swatch: SeriesSwatch }

/** Tooltip HTML đặt trên cột đang trỏ; `aria-live` để trình đọc màn hình đọc khi đổi cột bằng phím. */
export function ChartTooltip({ x, width, title, rows }: { x: number; width: number; title: string; rows: TooltipRow[] }) {
  const left = Math.max(84, Math.min(width - 84, x));
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute top-0 z-10 w-max min-w-36 -translate-x-1/2 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
      style={{ left }}
    >
      <p className="mb-1 font-medium">{title}</p>
      <ul className="space-y-0.5">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center gap-2">
            <Swatch swatch={row.swatch} />
            <span className="text-muted-foreground">{row.label}</span>
            <span className="ml-auto pl-3 font-medium tabular-nums">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Lưới ngang + nhãn trục y (đường lưới mờ, trục nền). */
export function YAxis({ ticks, scale, width, unit, format }: {
  ticks: number[]; scale: (v: number) => number; width: number; unit?: string; format?: (v: number) => string;
}) {
  const fmt = format ?? ((v: number) => formatNumber(v, 1));
  return (
    <g aria-hidden>
      {unit ? <text x={0} y={10} className="fill-muted-foreground text-[11px]">{unit}</text> : null}
      {ticks.map((t) => (
        <g key={t}>
          <line x1={CHART_MARGIN.left} x2={width - CHART_MARGIN.right} y1={scale(t)} y2={scale(t)}
            className={t === 0 ? "stroke-border" : "stroke-border/60"} strokeDasharray={t === 0 ? undefined : "2 4"} />
          <text x={CHART_MARGIN.left - 6} y={scale(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px] tabular-nums">{fmt(t)}</text>
        </g>
      ))}
    </g>
  );
}

/** Nhãn trục x (ngày) căn giữa cột; chỉ vẽ các nhãn được chọn để không chồng chữ. */
export function XAxis({ labels, visible, xAt, y }: { labels: string[]; visible: Set<number>; xAt: (i: number) => number; y: number }) {
  return (
    <g aria-hidden>
      {labels.map((label, i) => visible.has(i) ? (
        <text key={i} x={xAt(i)} y={y} textAnchor="middle" className="fill-muted-foreground text-[11px] tabular-nums">{label}</text>
      ) : null)}
    </g>
  );
}

/** Bảng dữ liệu ẩn cho trình đọc màn hình (bản thay thế dạng bảng của biểu đồ). */
export function SrDataTable({ caption, columns, rows }: { caption: string; columns: string[]; rows: (string | number)[][] }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead><tr>{columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
      <tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody>
    </table>
  );
}
