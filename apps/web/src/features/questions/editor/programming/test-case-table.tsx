import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { byteSize, formatBytes } from "../limits";

export interface TestRow { key: string; input: string; expected_output: string; is_public: boolean }

const COLUMNS = "sm:grid-cols-[1.75rem_6.5rem_minmax(0,1fr)_minmax(0,1fr)_auto]";

function Excerpt({ label, text, empty }: { label: string; text: string; empty: string }) {
  const lines = text.split("\n");
  const shown = lines.slice(0, 3).map((line) => line.length > 60 ? `${line.slice(0, 60)}…` : line).join("\n");
  return <div className="min-w-0 space-y-1">
    <p className="flex gap-1.5 text-[11px] text-muted-foreground"><span className="sm:sr-only">{label} ·</span>
      <span className="font-mono tabular-nums">{text ? `${formatBytes(byteSize(text))}${lines.length > 3 ? ` · ${lines.length} dòng` : ""}` : empty}</span></p>
    {text ? <pre className="overflow-hidden rounded-md bg-secondary px-2.5 py-1.5 font-mono text-xs leading-4 whitespace-pre text-foreground/85">{shown}</pre> : null}
  </div>;
}

/**
 * Bộ test dạng danh sách hàng (không khung): # · Mẫu/Ẩn · input · output mong đợi · thao tác.
 * `readOnly` cho chế độ xem.
 */
export function TestCaseTable({ tests, errors, readOnly, onToggle, onEdit, onMove, onDelete }: {
  tests: TestRow[]; errors?: Record<string, string>; readOnly?: boolean;
  onToggle?: (index: number, isPublic: boolean) => void; onEdit?: (index: number) => void;
  onMove?: (index: number, delta: -1 | 1) => void; onDelete?: (index: number) => void;
}) {
  return <div>
    <div className={cn("hidden gap-3 border-b px-1 pb-2 text-xs text-muted-foreground sm:grid", COLUMNS)} aria-hidden>
      <span>#</span><span>Loại</span><span>Input</span><span>Output mong đợi</span><span className="w-24" />
    </div>
    <ol aria-label="Danh sách test">
      {tests.map((test, index) => {
        const error = errors?.[`tests.${index}`];
        return <li key={test.key} data-field={`tests.${index}`}
          className={cn("grid grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-3 border-b px-1 py-3", COLUMNS, error && "bg-destructive/5")}>
          <span className="pt-0.5 font-mono text-xs text-muted-foreground tabular-nums">{index + 1}</span>
          <div>
            {readOnly ? <Badge variant={test.is_public ? "info" : "secondary"}>{test.is_public ? "Mẫu" : "Ẩn"}</Badge>
              : <ToggleGroup type="single" size="sm" className="h-7" aria-label={`Loại test ${index + 1}`} value={test.is_public ? "public" : "hidden"}
                onValueChange={(next) => next && onToggle?.(index, next === "public")}>
                <ToggleGroupItem value="hidden" className="px-2 text-xs">Ẩn</ToggleGroupItem>
                <ToggleGroupItem value="public" className="px-2 text-xs">Mẫu</ToggleGroupItem>
              </ToggleGroup>}
          </div>
          <div className="col-start-2 sm:col-start-auto"><Excerpt label="Input" text={test.input} empty="(trống)" /></div>
          <div className="col-start-2 sm:col-start-auto">
            <Excerpt label="Output" text={test.expected_output} empty="Chưa có output" />
            {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
          </div>
          {readOnly ? <span className="hidden w-24 sm:block" /> : <div className="col-start-2 flex w-24 items-center justify-end text-muted-foreground sm:col-start-auto">
            <Button type="button" variant="ghost" size="icon-xs" aria-label={`Đưa test ${index + 1} lên`} disabled={index === 0} onClick={() => onMove?.(index, -1)}><ArrowUp aria-hidden /></Button>
            <Button type="button" variant="ghost" size="icon-xs" aria-label={`Đưa test ${index + 1} xuống`} disabled={index === tests.length - 1} onClick={() => onMove?.(index, 1)}><ArrowDown aria-hidden /></Button>
            <Button type="button" variant="ghost" size="icon-xs" aria-label={`Sửa test ${index + 1}`} onClick={() => onEdit?.(index)}><Pencil aria-hidden /></Button>
            <Button type="button" variant="ghost" size="icon-xs" className="hover:text-destructive" aria-label={`Xóa test ${index + 1}`} onClick={() => onDelete?.(index)}><Trash2 aria-hidden /></Button>
          </div>}
        </li>;
      })}
    </ol>
  </div>;
}
