import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { byteSize, formatBytes } from "../limits";

export interface TestRow { key: string; input: string; expected_output: string; is_public: boolean }

function Excerpt({ text, empty }: { text: string; empty: string }) {
  if (!text) return <span className="text-xs text-muted-foreground italic">{empty}</span>;
  const lines = text.split("\n");
  const shown = lines.slice(0, 3).map((line) => line.length > 60 ? `${line.slice(0, 60)}…` : line).join("\n");
  return <span className="flex min-w-0 flex-col gap-0.5">
    <span className="font-mono text-[11px] text-muted-foreground">{formatBytes(byteSize(text))}{lines.length > 3 ? ` · ${lines.length} dòng` : ""}</span>
    <pre className="max-w-64 overflow-hidden font-mono text-xs leading-4 whitespace-pre text-foreground/80">{shown}</pre>
  </span>;
}

/** Bảng test: #, Mẫu/Ẩn, kích thước + vài dòng xem trước, thao tác. `readOnly` cho chế độ xem. */
export function TestCaseTable({ tests, errors, readOnly, onToggle, onEdit, onMove, onDelete }: {
  tests: TestRow[]; errors?: Record<string, string>; readOnly?: boolean;
  onToggle?: (index: number, isPublic: boolean) => void; onEdit?: (index: number) => void;
  onMove?: (index: number, delta: -1 | 1) => void; onDelete?: (index: number) => void;
}) {
  return <div className="overflow-hidden rounded-lg border">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">#</TableHead>
          <TableHead className="w-32">Loại</TableHead>
          <TableHead>Input</TableHead>
          <TableHead>Output mong đợi</TableHead>
          {readOnly ? null : <TableHead className="w-36 text-right"><span className="sr-only">Thao tác</span></TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {tests.map((test, index) => {
          const error = errors?.[`tests.${index}`];
          return <TableRow key={test.key} data-field={`tests.${index}`} className={cn("align-top", error && "bg-destructive/5")}>
            <TableCell className="font-mono text-xs text-muted-foreground tabular-nums">{index + 1}</TableCell>
            <TableCell>
              {readOnly ? <Badge variant={test.is_public ? "outline" : "secondary"}>{test.is_public ? "Mẫu" : "Ẩn"}</Badge>
                : <ToggleGroup type="single" size="sm" aria-label={`Loại test ${index + 1}`} value={test.is_public ? "public" : "hidden"}
                  onValueChange={(next) => next && onToggle?.(index, next === "public")}>
                  <ToggleGroupItem value="hidden" className="px-2.5 text-xs">Ẩn</ToggleGroupItem>
                  <ToggleGroupItem value="public" className="px-2.5 text-xs">Mẫu</ToggleGroupItem>
                </ToggleGroup>}
            </TableCell>
            <TableCell><Excerpt text={test.input} empty="(trống)" /></TableCell>
            <TableCell className="whitespace-normal">
              <Excerpt text={test.expected_output} empty="Chưa có output" />
              {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
            </TableCell>
            {readOnly ? null : <TableCell className="text-right">
              <div className="inline-flex items-center">
                <Button type="button" variant="ghost" size="icon-xs" aria-label={`Đưa test ${index + 1} lên`} disabled={index === 0} onClick={() => onMove?.(index, -1)}><ArrowUp aria-hidden /></Button>
                <Button type="button" variant="ghost" size="icon-xs" aria-label={`Đưa test ${index + 1} xuống`} disabled={index === tests.length - 1} onClick={() => onMove?.(index, 1)}><ArrowDown aria-hidden /></Button>
                <Button type="button" variant="ghost" size="icon-xs" aria-label={`Sửa test ${index + 1}`} onClick={() => onEdit?.(index)}><Pencil aria-hidden /></Button>
                <Button type="button" variant="ghost" size="icon-xs" className="text-muted-foreground hover:text-destructive" aria-label={`Xóa test ${index + 1}`} onClick={() => onDelete?.(index)}><Trash2 aria-hidden /></Button>
              </div>
            </TableCell>}
          </TableRow>;
        })}
      </TableBody>
    </Table>
  </div>;
}
