import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import { parseQuestionCsv } from "@/features/questions/question-csv";
import type { QuestionCsvPreview, QuestionCsvRow, QuestionImportResult } from "@/types/api";

const template = "data:text/csv;charset=utf-8," + encodeURIComponent("content,difficulty,topic,option_a,option_b,option_c,option_d,correct_option\n\"2 + 2 bằng bao nhiêu?\",easy,Số học,3,4,5,6,B\n");

export function QuestionCsvImportDialog({ bankId, categoryId, onOpenChange, onImported }: {
  bankId: number; categoryId: number; onOpenChange: (open: boolean) => void; onImported: () => void;
}) {
  const [rows, setRows] = useState<QuestionCsvRow[]>([]);
  const [preview, setPreview] = useState<QuestionCsvPreview | null>(null);
  const [result, setResult] = useState<QuestionImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const url = `/question-banks/${bankId}/categories/${categoryId}/questions/import`;

  async function read(file?: File) {
    if (!file) return;
    setBusy(true); setPreview(null); setResult(null);
    try {
      const parsed = parseQuestionCsv(await file.text());
      const checked = await api.post<QuestionCsvPreview>(`${url}/preview`, { rows: parsed });
      setRows(parsed); setPreview(checked);
    } catch (error) { toast.error(error instanceof Error ? error.message : errorText(error)); }
    finally { setBusy(false); }
  }

  async function importRows() {
    setBusy(true);
    try {
      const imported = await api.post<QuestionImportResult>(url, { rows });
      setResult(imported); onImported();
      if (imported.created) toast.success(`Đã nhập ${imported.created} câu hỏi.`);
      if (!imported.errors.length) onOpenChange(false);
    } catch (error) { toast.error(errorText(error)); }
    finally { setBusy(false); }
  }

  return <Dialog open onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader><DialogTitle className="font-heading">Nhập câu hỏi từ CSV</DialogTitle>
        <DialogDescription>Phiên bản này nhận câu trắc nghiệm với 2–6 lựa chọn. Xem trước sẽ kiểm tra dòng lỗi và câu trùng trước khi lưu.</DialogDescription></DialogHeader>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><label htmlFor="question-csv" className="text-sm font-medium">Chọn file CSV</label>
          <a href={template} download="mau-ngan-hang-cau-hoi.csv" className="text-sm text-primary underline-offset-4 hover:underline">Tải file mẫu</a></div>
        <Input id="question-csv" type="file" accept=".csv,text/csv" disabled={busy} onChange={(event) => { void read(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} />
        <p className="text-xs text-muted-foreground">Cột bắt buộc: content, option_a, option_b, correct_option. Có thể thêm option_c–option_f, difficulty và topic. correct_option dùng A–F.</p>
      </div>
      {preview ? <div className="space-y-2">
        <p className="text-sm font-medium">Hợp lệ: {preview.valid_rows} / {preview.rows.length}</p>
        <ul className="max-h-60 divide-y overflow-y-auto rounded-md border">{preview.rows.map((row) => <li key={row.row} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
          <span className="min-w-0"><span className="mr-2 text-muted-foreground">Dòng {row.row}</span><span className="line-clamp-2">{row.content || "Thiếu nội dung"}</span>{row.reason ? <span className="block text-xs text-destructive">{row.reason}</span> : null}</span>
          <span className={row.valid ? "shrink-0 text-xs text-success" : "shrink-0 text-xs text-destructive"}>{row.valid ? "Hợp lệ" : "Lỗi"}</span>
        </li>)}</ul>
      </div> : null}
      {result?.errors.length ? <p className="text-sm text-destructive">Có {result.errors.length} dòng lỗi khi lưu; các dòng hợp lệ đã được thêm. Kiểm tra danh sách phía trên.</p> : null}
      <DialogFooter><Button variant="ghost" onClick={() => onOpenChange(false)}>Đóng</Button>
        <Button onClick={() => void importRows()} disabled={busy || !preview?.valid_rows}>{busy ? "Đang xử lý…" : `Nhập ${preview?.valid_rows ?? 0} câu hỏi`}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
