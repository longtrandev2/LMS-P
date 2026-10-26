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
        <DialogHeader><DialogTitle>Nhập người dùng từ CSV</DialogTitle><DialogDescription>Tệp cần có cột email, full_name, student_code và role. Kiểm tra dữ liệu trước khi nhập.</DialogDescription></DialogHeader>
        {phase==="select" ? <div className="space-y-3">
          <Button type="button" variant="link" className="px-0" onClick={downloadTemplate}>Tải tệp CSV mẫu</Button>
          <button type="button" onClick={()=>inputRef.current?.click()} className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center transition-colors hover:border-input hover:bg-muted/50 outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <FileSpreadsheet className="size-8 text-muted-foreground" aria-hidden/><span className="text-sm font-medium">{file?.name??"Chọn tệp CSV từ máy tính"}</span><span className="text-xs text-muted-foreground">{file?`${(file.size/1024).toFixed(0)} KB — bấm để chọn tệp khác`:"Mỗi dòng gồm một tài khoản"}</span>
          </button>
          <input ref={inputRef} type="file" accept=".csv,text/csv" className="sr-only" aria-label="Chọn tệp CSV" onChange={(event)=>setFile(event.target.files?.[0]??null)}/>
        </div> : null}
        {phase==="preview" && preview ? <div className="space-y-3">
          <div className="rounded-lg border bg-muted/40 px-4 py-3"><p className="text-lg font-semibold">{preview.valid_rows} dòng hợp lệ sẵn sàng nhập</p><p className="text-sm text-muted-foreground">{preview.errors.length} dòng cần xem lại · {preview.duplicates.length} dòng bị trùng</p></div>
          {preview.errors.length ? <div className="max-h-64 overflow-auto rounded-lg border"><table className="w-full text-sm"><thead className="sticky top-0 bg-muted text-left"><tr><th className="px-3 py-2">Dòng</th><th className="px-3 py-2">Lỗi cần sửa</th></tr></thead><tbody>{preview.errors.map((error)=><tr key={error.row} className="border-t"><td className="px-3 py-2 font-mono">{error.row}</td><td className="px-3 py-2 text-destructive">{error.reason}</td></tr>)}</tbody></table></div>:<p className="text-sm text-success">Tất cả dòng đều hợp lệ.</p>}
        </div>:null}
        {phase==="result" && result ? <div className="space-y-3">
          <p className="font-medium">Đã tạo {result.created} tài khoản · bỏ qua {result.skipped.length} dòng trùng.</p>
          {result.errors.length ? <ul className="max-h-32 list-inside list-disc overflow-auto text-sm text-destructive">{result.errors.map((error)=><li key={error.row}>Dòng {error.row}: {error.reason}</li>)}</ul>:null}
          {result.temp_passwords.length ? <div className="space-y-2"><p className="text-sm font-medium">Mật khẩu tạm — hãy lưu trước khi đóng</p>{result.temp_passwords.map((entry)=><div key={entry.email}><p className="font-mono text-xs">{entry.email}</p><TempPasswordReveal password={entry.temp_password}/></div>)}</div>:null}
        </div>:null}
        <DialogFooter>
          {phase==="select" ? <><Button variant="ghost" onClick={()=>onOpenChange(false)}>Hủy</Button><Button disabled={!file||submitting} onClick={()=>upload("preview")}><Upload aria-hidden/>{submitting?"Đang kiểm tra…":"Kiểm tra tệp"}</Button></>:null}
          {phase==="preview" ? <><Button variant="ghost" onClick={reset}>Chọn tệp khác</Button><Button disabled={!preview?.valid_rows||submitting} onClick={()=>upload("import")}>{submitting?"Đang nhập…":`Nhập ${preview?.valid_rows??0} dòng hợp lệ`}</Button></>:null}
          {phase==="result" ? <Button onClick={()=>onOpenChange(false)}>Hoàn tất</Button>:null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
