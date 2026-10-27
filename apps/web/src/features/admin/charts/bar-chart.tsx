import { CHART_MARGIN, formatNumber, topRoundedRect, visibleLabelIndexes, yScale } from "./chart-scale";
import { ChartLegend, ChartTooltip, SrDataTable, XAxis, YAxis, type SeriesSwatch } from "./chart-parts";
import { useChartCursor, useElementWidth } from "./use-chart-cursor";

export interface BarSeries { key: string; label: string; /** Lớp `fill-*` của đoạn cột. */ fillClass: string; swatchClass: string }
export interface BarDatum { label: string; title: string; values: Record<string, number> }

interface BarChartProps {
  /** Mô tả ngắn cho `aria-label`. */
  label: string;
  series: BarSeries[];
  data: BarDatum[];
  height?: number;
  unit?: string;
}

const GAP = 2;

/** Biểu đồ cột chồng (series đầu tiên nằm dưới cùng), SVG tự vẽ, có tooltip chuột/bàn phím. */
export function BarChart({ label, series, data, height = 200, unit }: BarChartProps) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const plotW = Math.max(1, width - CHART_MARGIN.left - CHART_MARGIN.right);
  const plotH = height - CHART_MARGIN.top - CHART_MARGIN.bottom;
  const step = plotW / Math.max(1, data.length);
  const barW = Math.max(3, Math.min(28, step * 0.62));
  const totals = data.map((d) => series.reduce((sum, s) => sum + (d.values[s.key] ?? 0), 0));
  const { max, ticks } = yScale(Math.max(0, ...totals), { integer: true });
  const scale = (v: number) => CHART_MARGIN.top + plotH - (v / max) * plotH;
  const xAt = (i: number) => CHART_MARGIN.left + step * (i + 0.5);
  const { active, svgProps } = useChartCursor(data.length, CHART_MARGIN.left, step);
  const swatch = (s: BarSeries): SeriesSwatch => ({ kind: "box", className: s.swatchClass });

  const summary = `${label}. Tổng ${formatNumber(totals.reduce((a, b) => a + b, 0))} trong ${data.length} ngày. Dùng phím mũi tên để xem từng ngày.`;

  return (
    <div className="space-y-3">
      <ChartLegend items={series.map((s) => ({ key: s.key, label: s.label, swatch: swatch(s) }))} />
      <div ref={ref} className="relative">
        <svg role="img" aria-label={summary} width={width} height={height}
          className="block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring" {...svgProps}>
          <YAxis ticks={ticks} scale={scale} width={width} unit={unit} format={(v) => formatNumber(v)} />
          {active !== null ? (
            <rect x={CHART_MARGIN.left + step * active} y={CHART_MARGIN.top} width={step} height={plotH} className="fill-accent/70" />
          ) : null}
          {data.map((d, i) => {
            let base = 0;
            const visible = series.filter((s) => (d.values[s.key] ?? 0) > 0);
            return (
              <g key={i}>
                {visible.map((s, k) => {
                  const value = d.values[s.key] ?? 0;
                  const y0 = scale(base);
                  base += value;
                  const y1 = scale(base);
                  const isTop = k === visible.length - 1;
                  const h = Math.max(1, y0 - y1 - (k > 0 ? GAP : 0));
                  const x = xAt(i) - barW / 2;
                  return isTop
                    ? <path key={s.key} d={topRoundedRect(x, y1, barW, h)} className={s.fillClass} />
                    : <rect key={s.key} x={x} y={y0 - h - (k > 0 ? GAP : 0)} width={barW} height={h} className={s.fillClass} />;
                })}
              </g>
            );
          })}
          <XAxis labels={data.map((d) => d.label)} visible={visibleLabelIndexes(data.length, plotW)} xAt={xAt} y={height - 6} />
        </svg>
        {active !== null && data[active] ? (
          <ChartTooltip
            x={xAt(active)}
            width={width}
            title={data[active].title}
            rows={[
              ...series.slice().reverse().map((s) => ({ key: s.key, label: s.label, value: formatNumber(data[active].values[s.key] ?? 0), swatch: swatch(s) })),
              { key: "__total", label: "Tổng", value: formatNumber(totals[active]), swatch: { kind: "box", className: "bg-transparent" } },
            ]}
          />
        ) : null}
      </div>
      <SrDataTable
        caption={label}
        columns={["Ngày", ...series.map((s) => s.label), "Tổng"]}
        rows={data.map((d, i) => [d.title, ...series.map((s) => d.values[s.key] ?? 0), totals[i]])}
      />
    </div>
  );
}
