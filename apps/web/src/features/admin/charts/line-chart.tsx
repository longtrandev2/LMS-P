import { CHART_MARGIN, visibleLabelIndexes, yScale } from "./chart-scale";
import { ChartLegend, ChartTooltip, SrDataTable, XAxis, YAxis, type SeriesSwatch } from "./chart-parts";
import { useChartCursor, useElementWidth } from "./use-chart-cursor";

export interface LineSeries {
  key: string;
  label: string;
  /** Lớp `stroke-*` cho đường; điểm dùng `fill-*` tương ứng. */
  strokeClass: string;
  fillClass: string;
  dashed?: boolean;
}
export interface LineDatum { label: string; title: string; values: Record<string, number | null> }

interface LineChartProps {
  label: string;
  series: LineSeries[];
  data: LineDatum[];
  height?: number;
  unit?: string;
  /** Định dạng nhãn trục y. */
  format: (value: number) => string;
  /** Định dạng giá trị trong tooltip và bảng (mặc định như trục, nên kèm đơn vị). */
  formatValue?: (value: number) => string;
}

/** Tách chuỗi điểm thành các đoạn liền nhau — ngày null tạo khoảng trống, không nối qua. */
function segments(points: ({ x: number; y: number } | null)[]): string[] {
  const result: string[] = [];
  let current: string[] = [];
  for (const p of points) {
    if (p) current.push(`${current.length ? "L" : "M"}${p.x},${p.y}`);
    else if (current.length) { result.push(current.join("")); current = []; }
  }
  if (current.length) result.push(current.join(""));
  return result;
}

/** Biểu đồ đường nhiều chuỗi chung một trục y; có khoảng trống cho ngày không có dữ liệu. */
export function LineChart({ label, series, data, height = 200, unit, format, formatValue = format }: LineChartProps) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const plotW = Math.max(1, width - CHART_MARGIN.left - CHART_MARGIN.right);
  const plotH = height - CHART_MARGIN.top - CHART_MARGIN.bottom;
  const step = plotW / Math.max(1, data.length);
  const all = data.flatMap((d) => series.map((s) => d.values[s.key])).filter((v): v is number => v != null);
  const { max, ticks } = yScale(Math.max(0, ...all));
  const scale = (v: number) => CHART_MARGIN.top + plotH - (v / max) * plotH;
  const xAt = (i: number) => CHART_MARGIN.left + step * (i + 0.5);
  const { active, svgProps } = useChartCursor(data.length, CHART_MARGIN.left, step);
  const swatch = (s: LineSeries): SeriesSwatch => ({ kind: "line", className: s.strokeClass, dashed: s.dashed });
  const pointRadius = data.length > 14 ? 2.5 : 3.5;
  const daysWithData = data.filter((d) => series.some((s) => d.values[s.key] != null)).length;

  return (
    <div className="space-y-3">
      <ChartLegend items={series.map((s) => ({ key: s.key, label: s.label, swatch: swatch(s) }))} />
      <div ref={ref} className="relative">
        <svg role="img" aria-label={`${label}. Có dữ liệu ${daysWithData}/${data.length} ngày. Dùng phím mũi tên để xem từng ngày.`}
          width={width} height={height} className="block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring" {...svgProps}>
          <YAxis ticks={ticks} scale={scale} width={width} unit={unit} format={format} />
          {active !== null ? (
            <line x1={xAt(active)} x2={xAt(active)} y1={CHART_MARGIN.top} y2={CHART_MARGIN.top + plotH} className="stroke-muted-foreground/50" />
          ) : null}
          {series.map((s) => {
            const points = data.map((d, i) => {
              const v = d.values[s.key];
              return v == null ? null : { x: xAt(i), y: scale(v) };
            });
            return (
              <g key={s.key}>
                {segments(points).map((d, i) => (
                  <path key={i} d={d} fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"
                    strokeDasharray={s.dashed ? "5 4" : undefined} className={s.strokeClass} />
                ))}
                {points.map((p, i) => p ? (
                  <circle key={i} cx={p.x} cy={p.y} r={i === active ? pointRadius + 1.5 : pointRadius}
                    strokeWidth={2} className={`${s.fillClass} stroke-card`} />
                ) : null)}
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
            rows={series.map((s) => {
              const v = data[active].values[s.key];
              return { key: s.key, label: s.label, value: v == null ? "Không có bài" : formatValue(v), swatch: swatch(s) };
            })}
          />
        ) : null}
      </div>
      <SrDataTable
        caption={label}
        columns={["Ngày", ...series.map((s) => s.label)]}
        rows={data.map((d) => [d.title, ...series.map((s) => { const v = d.values[s.key]; return v == null ? "—" : formatValue(v); })])}
      />
    </div>
  );
}
