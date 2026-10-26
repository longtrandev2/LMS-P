import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import type { QuestionCategory, QuestionCsvPreview, QuestionCsvRow, QuestionImportResult } from "@/types/api";
import { csvTemplateBlob, parseQuestionCsv } from "./question-csv";
import { QuestionCsvPreviewTable } from "./question-csv-preview-table";

function downloadTemplate() {
  const url = URL.createObjectURL(csvTemplateBlob());
  const link = Object.assign(document.createElement("a"), { href: url, download: "mau-ngan-hang-cau-hoi.csv" });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Nhập câu hỏi từ CSV vào danh mục chọn trong dialog (mặc định “Chưa phân loại”). */
export function QuestionCsvImportDialog({ bankId, categories, defaultCategoryId, onOpenChange, onImported }: {
  bankId: number; categories: QuestionCategory[]; defaultCategoryId: number | null;
  onOpenChange: (open: boolean) => void; onImported: () => void;
}) {
  const fallback = categories.find((item) => item.name === "Chưa phân loại")?.id ?? categories[0]?.id ?? null;
  const [categoryId, setCategoryId] = useState<number | null>(defaultCategoryId ?? fallback);
  const [rows, setRows] = useState<QuestionCsvRow[]>([]);
  const [preview, setPreview] = useState<QuestionCsvPreview | null>(null);
  const [importErrors, setImportErrors] = useState(new Map<number, string>());
  const [busy, setBusy] = useState(false);
  const url = `/question-banks/${bankId}/categories/${categoryId}/questions/import`;

  async function read(file?: File) {
    if (!file || categoryId == null) return;
    setBusy(true); setPreview(null); setImportErrors(new Map());
    try {
      const parsed = parseQuestionCsv(await file.text());
      const checked = await api.post<QuestionCsvPreview>(`${url}/preview`, { rows: parsed });
      setRows(parsed); setPreview(checked);
    } catch (error) { toast.error(error instanceof Error && !("code" in error) ? error.message : errorText(error)); }
    finally { setBusy(false); }
  }

  async function importRows() {
    setBusy(true);
    try {
      const imported = await api.post<QuestionImportResult>(url, { rows });
      setImportErrors(new Map(imported.errors.map((item) => [item.row, item.reason])));
      onImported();
      if (imported.created) toast.success(`Đã nhập ${imported.created} câu hỏi.`);
      if (!imported.errors.length) onOpenChange(false);
    } catch (error) { toast.error(errorText(error)); }
    finally { setBusy(false); }
  }

  return <Dialog open onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle className="font-heading">Nhập câu hỏi từ CSV</DialogTitle>
        <DialogDescription>Hỗ trợ Một đáp án, Nhiều đáp án, Đúng/Sai và Trả lời ngắn. Bản xem trước kiểm tra lỗi và câu trùng trước khi lưu.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="csv-category">Danh mục đích</Label>
          <Select value={categoryId != null ? String(categoryId) : ""} disabled={busy || !categories.length}
            onValueChange={(value) => { setCategoryId(Number(value)); setPreview(null); }}>
            <SelectTrigger id="csv-category" className="w-full"><SelectValue placeholder="Chọn danh mục" /></SelectTrigger>
            <SelectContent position="popper">{categories.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2"><Label htmlFor="question-csv">File CSV</Label>
            <Button type="button" variant="link" size="xs" className="h-auto px-0" onClick={downloadTemplate}><Download aria-hidden /> Tải file mẫu</Button></div>
          <Input id="question-csv" type="file" accept=".csv,text/csv" disabled={busy || categoryId == null}
            onChange={(event) => { void read(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} />
        </div>
      </div>
      <ul className="list-disc space-y-1 pl-5 text-xs leading-5 text-muted-foreground">
        <li>Cột bắt buộc: <code className="font-mono">content</code>, <code className="font-mono">correct_option</code>. Tùy chọn: <code className="font-mono">type</code> (mặc định mcq), <code className="font-mono">difficulty</code>, <code className="font-mono">option_a…option_h</code>, <code className="font-mono">explanation</code>.</li>
        <li><code className="font-mono">correct_option</code>: <code className="font-mono">B</code> (một đáp án, đúng/sai), <code className="font-mono">A;C</code> (nhiều đáp án), hoặc <code className="font-mono">TCP|Transmission Control Protocol</code> (trả lời ngắn).</li>
        <li>Phân cách bằng dấu phẩy hoặc chấm phẩy đều được; nên lưu UTF-8.</li>
      </ul>
      {preview ? <QuestionCsvPreviewTable preview={preview} rows={rows} importErrors={importErrors} /> : busy ? <p role="status" className="text-sm text-muted-foreground">Đang đọc file…</p> : null}
      {importErrors.size ? <p className="text-sm text-destructive">Có {importErrors.size} dòng lỗi khi lưu; các dòng hợp lệ đã được thêm.</p> : null}
      <DialogFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>Đóng</Button>
        <Button onClick={() => void importRows()} disabled={busy || !preview?.valid_rows || importErrors.size > 0}>{busy ? "Đang xử lý…" : `Nhập ${preview?.valid_rows ?? 0} câu hỏi`}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
