import { useRef, useState } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TempPasswordReveal } from "@/features/users/temp-password-reveal";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import type { ImportPreview, ImportResult } from "@/types/api";

interface Props { open: boolean; onOpenChange: (open: boolean) => void; onImported: () => void }
type Phase = "select" | "preview" | "result";

function downloadTemplate() {
  const blob = new Blob(["email,full_name,student_code,role\r\nstudent@example.edu.vn,Nguyen Van A,SV001,student\r\n"], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
  anchor.href = url; anchor.download = "users-template.csv"; anchor.click(); URL.revokeObjectURL(url);
}

export function ImportUsersPreviewDialog({ open, onOpenChange, onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null); const [phase, setPhase] = useState<Phase>("select");
  const [preview, setPreview] = useState<ImportPreview | null>(null); const [result, setResult] = useState<ImportResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  function reset() { setFile(null); setPhase("select"); setPreview(null); setResult(null); if(inputRef.current) inputRef.current.value=""; }
  async function upload(action: "preview" | "import") {
    if (!file) return; setSubmitting(true); const form = new FormData(); form.append("file",file);
    try {
      if(action==="preview") { setPreview(await api.upload<ImportPreview>("/users/import/preview",form)); setPhase("preview"); }
      else { const data=await api.upload<ImportResult>("/users/import",form); setResult(data); setPhase("result"); onImported(); toast.success(`Đã nhập ${data.created} tài khoản.`); }
    } catch(error) { toast.error(errorText(error)); } finally { setSubmitting(false); }
  }
  return (
    <Dialog open={open} onOpenChange={(value)=>{onOpenChange(value);if(!value)reset();}}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>Nhập người dùng từ CSV</DialogTitle><DialogDescription>Tệp gồm các cột <span className="font-mono text-xs">email, full_name, student_code, role</span>. Hệ thống kiểm tra trước, bạn xác nhận rồi mới nhập.</DialogDescription></DialogHeader>
        {phase === "select" ? (
          <div className="space-y-2">
            <button type="button" onClick={() => inputRef.current?.click()}
              className="flex w-full cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-dashed border-input bg-sidebar px-6 py-9 text-center transition-colors outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring">
              <FileSpreadsheet className="size-5 text-muted-foreground" strokeWidth={1.75} aria-hidden />
              <span className="text-sm font-medium">{file?.name ?? "Chọn tệp CSV từ máy tính"}</span>
              <span className="text-xs text-muted-foreground">{file ? `${(file.size / 1024).toFixed(0)} KB · bấm để chọn tệp khác` : "Mỗi dòng là một tài khoản"}</span>
            </button>
            <input ref={inputRef} type="file" accept=".csv,text/csv" className="sr-only" aria-label="Chọn tệp CSV" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            <button type="button" onClick={downloadTemplate} className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Tải tệp CSV mẫu</button>
          </div>
        ) : null}
        {phase === "preview" && preview ? (
          <div className="space-y-4">
            <div>
              <p className="text-2xl font-semibold tabular-nums">{preview.valid_rows} <span className="text-sm font-normal text-muted-foreground">dòng hợp lệ sẵn sàng nhập</span></p>
              <p className="text-sm text-muted-foreground">{preview.errors.length} dòng cần sửa · {preview.duplicates.length} dòng trùng sẽ bỏ qua</p>
            </div>
            {preview.errors.length ? (
              <div className="max-h-64 overflow-auto border-t">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-popover text-left text-xs text-muted-foreground"><tr><th className="w-16 py-2 font-medium">Dòng</th><th className="py-2 font-medium">Lỗi cần sửa</th></tr></thead>
                  <tbody>{preview.errors.map((error) => <tr key={error.row} className="border-t"><td className="py-2 font-mono text-xs text-muted-foreground">{error.row}</td><td className="py-2 text-destructive">{error.reason}</td></tr>)}</tbody>
                </table>
              </div>
            ) : <p className="text-sm text-success">Tất cả dòng đều hợp lệ.</p>}
          </div>
        ) : null}
        {phase === "result" && result ? (
          <div className="space-y-4">
            <p className="text-sm"><span className="font-medium">Đã tạo {result.created} tài khoản</span><span className="text-muted-foreground"> · bỏ qua {result.skipped.length} dòng trùng</span></p>
            {result.errors.length ? <ul className="max-h-32 space-y-1 overflow-auto text-sm text-destructive">{result.errors.map((error) => <li key={error.row}>Dòng {error.row}: {error.reason}</li>)}</ul> : null}
            {result.temp_passwords.length ? (
              <div className="space-y-2 border-t pt-4">
                <p className="text-sm font-medium">Mật khẩu tạm <span className="font-normal text-muted-foreground">· lưu lại trước khi đóng</span></p>
                {result.temp_passwords.map((entry) => <div key={entry.email} className="space-y-1"><p className="font-mono text-xs text-muted-foreground">{entry.email}</p><TempPasswordReveal password={entry.temp_password} /></div>)}
              </div>
            ) : null}
          </div>
        ) : null}
        <DialogFooter>
          {phase==="select" ? <><Button variant="outline" onClick={()=>onOpenChange(false)}>Hủy</Button><Button disabled={!file||submitting} onClick={()=>upload("preview")}><Upload aria-hidden/>{submitting?"Đang kiểm tra…":"Kiểm tra tệp"}</Button></>:null}
          {phase==="preview" ? <><Button variant="outline" onClick={reset}>Chọn tệp khác</Button><Button disabled={!preview?.valid_rows||submitting} onClick={()=>upload("import")}>{submitting?"Đang nhập…":`Nhập ${preview?.valid_rows??0} dòng hợp lệ`}</Button></>:null}
          {phase==="result" ? <Button onClick={()=>onOpenChange(false)}>Hoàn tất</Button>:null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
