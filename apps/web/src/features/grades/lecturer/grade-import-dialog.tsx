import { useState } from "react";
import { FileUp } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { errorText } from "@/lib/error-messages";
import { formatScore } from "@/lib/grades";
import type { GradeImportRow } from "@/types/api";
import { parseGradeCsv } from "./grade-csv";
import { useGradeMutations } from "./use-gradebook";

interface PreviewLine { row: number; code: string; name?: string | null; midterm?: number | null; final?: number | null; valid: boolean; reason?: string | null }

/** Nhập điểm Giữa kỳ/Cuối kỳ từ CSV: đọc ở trình duyệt → xem trước (lỗi từng dòng) → xác nhận ghi các dòng hợp lệ. */
export function GradeImportDialog({ classId, onOpenChange }: { classId: string; onOpenChange: (open: boolean) => void }) {
  const { preview, importRows } = useGradeMutations(classId);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<GradeImportRow[]>([]);
  const [lines, setLines] = useState<PreviewLine[] | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    setLines(null);
    const parsed = parseGradeCsv(await file.text());
    const local: PreviewLine[] = parsed.errors.map((e) => ({ row: e.row, code: "", valid: false, reason: e.reason }));
    if (parsed.rows.length === 0) { setRows([]); setLines(local); return; }
    try {
      const result = await preview.mutateAsync(parsed.rows);
      const byRow = new Map(parsed.rows.map((r) => [r.row, r]));
      const valid = result.rows.filter((r) => r.valid).map((r) => byRow.get(r.row)).filter((r): r is GradeImportRow => !!r);
      setRows(valid);
      setLines([...local, ...result.rows.map((r) => ({
        row: r.row, code: r.student_code, name: r.full_name, midterm: byRow.get(r.row)?.midterm, final: byRow.get(r.row)?.final, valid: r.valid, reason: r.reason,
      }))].sort((a, b) => a.row - b.row));
    } catch (e) { toast.error(errorText(e)); }
  }

  async function confirm() {
    try {
      const result = await importRows.mutateAsync(rows);
      toast.success(`Đã nhập điểm cho ${result.imported} sinh viên${result.errors.length ? `, ${result.errors.length} dòng lỗi` : ""}.`);
      onOpenChange(false);
    } catch (e) { toast.error(errorText(e)); }
  }

  const errors = lines?.filter((l) => !l.valid).length ?? 0;
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nhập điểm Giữa kỳ / Cuối kỳ</DialogTitle>
          <DialogDescription>
            Tệp CSV có tiêu đề <code className="font-mono text-xs">student_code, midterm, final</code> (phân cách bằng dấu phẩy hoặc chấm phẩy).
          </DialogDescription>
        </DialogHeader>
        <label className="flex cursor-pointer items-center gap-3 rounded-lg bg-secondary px-4 py-3 text-sm transition-colors hover:bg-accent focus-within:ring-2 focus-within:ring-ring">
          <FileUp className="size-4 text-muted-foreground" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{fileName || "Chọn tệp .csv"}</span>
          <span className="text-muted-foreground">{preview.isPending ? "Đang kiểm tra…" : "Duyệt…"}</span>
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        {lines ? (
          <div className="space-y-2">
            <p className="text-sm tabular-nums"><strong>{rows.length}</strong> dòng hợp lệ{errors ? <> · <span className="text-destructive">{errors} dòng lỗi</span></> : null}</p>
            <div className="max-h-72 overflow-y-auto rounded-lg border">
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="w-14">Dòng</TableHead><TableHead>Mã SV</TableHead><TableHead>Họ tên</TableHead>
                  <TableHead className="text-right">GK</TableHead><TableHead className="text-right">CK</TableHead><TableHead>Kết quả</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {lines.map((l) => (
                    <TableRow key={l.row}>
                      <TableCell className="tabular-nums text-muted-foreground">{l.row}</TableCell>
                      <TableCell className="font-mono text-xs">{l.code || "—"}</TableCell>
                      <TableCell>{l.name || "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatScore(l.midterm, 2)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatScore(l.final, 2)}</TableCell>
                      <TableCell className="whitespace-normal">
                        {l.valid ? <Badge variant="success">Hợp lệ</Badge> : <span className="text-xs text-destructive">{l.reason || "Không hợp lệ"}</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button disabled={rows.length === 0 || importRows.isPending} onClick={confirm}>
            {importRows.isPending ? "Đang nhập…" : `Nhập ${rows.length} dòng`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
