import { VerdictBadge } from "@/components/verdict-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { GradingVerdict } from "@/types/api";

export interface RunRow {
  position: number; verdict: GradingVerdict; time_ms?: number | null;
  input?: string | null; expected?: string | null; output?: string | null;
}

function Block({ label, text }: { label: string; text?: string | null }) {
  return <div className="min-w-0 space-y-1">
    <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
    <pre className="max-h-48 overflow-auto rounded-md border bg-muted/40 p-2 font-mono text-xs leading-4 whitespace-pre-wrap break-all">
      {text == null ? <span className="text-muted-foreground italic">không có</span> : text || <span className="text-muted-foreground italic">(rỗng)</span>}
    </pre>
  </div>;
}

/** Kết quả chạy từng test: verdict, thời gian; test sai mở xem expected và output cạnh nhau. */
export function RunResultsTable({ rows }: { rows: RunRow[] }) {
  return <div className="overflow-hidden rounded-lg border">
    <Table>
      <TableHeader className="bg-muted/40"><TableRow>
        <TableHead className="w-12">Test</TableHead><TableHead className="w-44">Kết quả</TableHead>
        <TableHead className="w-24 text-right">Thời gian</TableHead><TableHead>Chi tiết</TableHead>
      </TableRow></TableHeader>
      <TableBody>
        {rows.map((row) => {
          const ok = row.verdict === "AC" || row.verdict === "OK";
          return <TableRow key={row.position} className="align-top">
            <TableCell className="font-mono text-xs">#{row.position}</TableCell>
            <TableCell><VerdictBadge verdict={row.verdict} /></TableCell>
            <TableCell className="text-right font-mono text-xs">{row.time_ms != null ? `${row.time_ms} ms` : "—"}</TableCell>
            <TableCell className="whitespace-normal">
              {ok ? <span className="text-xs text-muted-foreground">—</span> : <details className="group">
                <summary className="cursor-pointer rounded text-xs font-medium outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/40">So sánh output</summary>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {row.input != null ? <div className="md:col-span-2"><Block label="Input" text={row.input} /></div> : null}
                  <Block label="Output mong đợi" text={row.expected} />
                  <Block label="Output của lời giải" text={row.output} />
                </div>
              </details>}
            </TableCell>
          </TableRow>;
        })}
      </TableBody>
    </Table>
  </div>;
}
