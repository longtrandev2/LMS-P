import { VerdictBadge } from "@/components/verdict-badge";
import type { GradingVerdict } from "@/types/api";

export interface RunRow {
  position: number; verdict: GradingVerdict; time_ms?: number | null;
  input?: string | null; expected?: string | null; output?: string | null;
}

function Block({ label, text }: { label: string; text?: string | null }) {
  return <div className="min-w-0 space-y-1">
    <p className="text-[11px] text-muted-foreground">{label}</p>
    <pre className="max-h-48 overflow-auto rounded-md bg-secondary px-2.5 py-2 font-mono text-xs leading-4 whitespace-pre-wrap break-all">
      {text == null ? <span className="text-muted-foreground italic">không có</span> : text || <span className="text-muted-foreground italic">(rỗng)</span>}
    </pre>
  </div>;
}

/** Kết quả chạy từng test dạng danh sách hàng: Test #n · verdict · thời gian; test sai mở so sánh output. */
export function RunResultsTable({ rows }: { rows: RunRow[] }) {
  return <ol aria-label="Kết quả từng test" className="border-t">
    {rows.map((row) => {
      const ok = row.verdict === "AC" || row.verdict === "OK";
      const head = <>
        <span className="w-16 shrink-0 text-sm">Test {row.position}</span>
        <VerdictBadge verdict={row.verdict} />
        <span className="ml-auto font-mono text-xs text-muted-foreground tabular-nums">{row.time_ms != null ? `${row.time_ms} ms` : "—"}</span>
      </>;
      return <li key={row.position} className="border-b">
        {ok ? <div className="flex items-center gap-3 px-1 py-2.5">{head}<span className="w-28" aria-hidden /></div> : <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-3 rounded-md px-1 py-2.5 outline-none select-none hover:bg-secondary/60 focus-visible:ring-2 focus-visible:ring-ring">
            {head}
            <span className="w-28 text-right text-xs font-medium text-muted-foreground group-open:text-foreground">So sánh output</span>
          </summary>
          <div className="grid gap-3 px-1 pb-3 md:grid-cols-2">
            {row.input != null ? <div className="md:col-span-2"><Block label="Input" text={row.input} /></div> : null}
            <Block label="Output mong đợi" text={row.expected} />
            <Block label="Output của lời giải" text={row.output} />
          </div>
        </details>}
      </li>;
    })}
  </ol>;
}
