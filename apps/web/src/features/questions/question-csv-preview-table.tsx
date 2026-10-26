import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { questionTypeLabel } from "@/lib/question-types";
import type { QuestionCsvPreview, QuestionCsvRow } from "@/types/api";
import { CheckBox } from "./ui/choice-controls";

/** Bảng xem trước CSV: loại, nội dung, đáp án, trạng thái; lọc “chỉ dòng lỗi”. */
export function QuestionCsvPreviewTable({ preview, rows, importErrors }: {
  preview: QuestionCsvPreview; rows: QuestionCsvRow[]; importErrors: Map<number, string>;
}) {
  const [onlyErrors, setOnlyErrors] = useState(false);
  const source = new Map(rows.map((row) => [row.row, row]));
  const shown = preview.rows.filter((row) => !onlyErrors || !row.valid || importErrors.has(row.row));
  const errorCount = preview.rows.length - preview.valid_rows;
  return <div className="space-y-2">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm"><span className="font-semibold">{preview.valid_rows}</span> / {preview.rows.length} dòng hợp lệ
        {errorCount ? <span className="text-destructive"> · {errorCount} dòng lỗi</span> : null}</p>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <CheckBox checked={onlyErrors} onCheckedChange={(checked) => setOnlyErrors(checked === true)} /> Chỉ dòng lỗi
      </label>
    </div>
    <div className="max-h-72 overflow-y-auto rounded-lg border">
      <Table>
        <TableHeader className="sticky top-0 bg-card"><TableRow>
          <TableHead className="w-14">Dòng</TableHead><TableHead className="w-28">Loại</TableHead><TableHead>Nội dung</TableHead>
          <TableHead className="w-32">Đáp án</TableHead><TableHead className="w-40">Trạng thái</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {shown.map((row) => {
            const original = source.get(row.row);
            const saveError = importErrors.get(row.row);
            const ok = row.valid && !saveError;
            return <TableRow key={row.row} className="align-top">
              <TableCell className="font-mono text-xs text-muted-foreground">{row.row}</TableCell>
              <TableCell className="text-xs">{original?.type ? questionTypeLabel(original.type) : "—"}</TableCell>
              <TableCell className="max-w-72 whitespace-normal"><span className="line-clamp-2 text-xs">{row.content || "Thiếu nội dung"}</span></TableCell>
              <TableCell className="max-w-32 truncate font-mono text-xs">{original?.correct_option || "—"}</TableCell>
              <TableCell className={ok ? "text-xs text-success" : "text-xs whitespace-normal text-destructive"}>{ok ? "Hợp lệ" : saveError ?? row.reason ?? "Lỗi"}</TableCell>
            </TableRow>;
          })}
          {shown.length === 0 ? <TableRow><TableCell colSpan={5} className="py-6 text-center text-xs text-muted-foreground">Không có dòng lỗi.</TableCell></TableRow> : null}
        </TableBody>
      </Table>
    </div>
  </div>;
}
