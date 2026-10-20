"use client";

import { useRef, useState } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TempPasswordReveal } from "@/components/users/temp-password-reveal";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import type { ImportResult } from "@/types/api";

interface ImportUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

/** POST /users/import — multipart CSV (email, họ tên, mã SV, role) */
export function ImportUsersDialog({ open, onOpenChange, onImported }: ImportUsersDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  function reset() {
    setFile(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleUpload() {
    if (!file) return;
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const data = await api.upload<ImportResult>("/users/import", form);
      setResult(data);
      onImported();
      if (data.errors.length === 0) toast.success(`Đã nhập ${data.created} tài khoản.`);
    } catch (error) {
      toast.error(errorText(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">Nhập người dùng từ CSV</DialogTitle>
          <DialogDescription>
            Tệp gồm các cột: email, họ tên, mã sinh viên, vai trò (student/lecturer/admin).
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-success/40 bg-success/10 px-4 py-3">
                <p className="text-2xl font-semibold tabular-nums text-success">{result.created}</p>
                <p className="text-xs text-muted-foreground">tài khoản đã tạo</p>
              </div>
              <div className="rounded-lg border bg-muted px-4 py-3">
                <p className="text-2xl font-semibold tabular-nums">{result.skipped.length}</p>
                <p className="text-xs text-muted-foreground">dòng bỏ qua (đã tồn tại)</p>
              </div>
            </div>

            {result.skipped.length > 0 ? (
              <div className="rounded-lg border px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Email đã tồn tại, bỏ qua
                </p>
                <ul className="mt-1 space-y-0.5">
                  {result.skipped.map((email) => (
                    <li key={email} className="font-mono text-xs">
                      {email}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {result.errors.length > 0 ? (
              <div className="max-h-40 overflow-y-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Dòng</th>
                      <th className="px-3 py-2 font-medium">Lý do</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.map((err) => (
                      <tr key={err.row} className="border-t">
                        <td className="px-3 py-1.5 font-mono tabular-nums">{err.row}</td>
                        <td className="px-3 py-1.5 text-destructive">{err.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {result.temp_passwords.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Mật khẩu tạm của các tài khoản vừa tạo
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    — chỉ hiển thị lần này, hãy lưu lại trước khi đóng
                  </span>
                </p>
                <div className="space-y-2">
                  {result.temp_passwords.map((entry) => (
                    <div key={entry.email} className="space-y-1">
                      <p className="font-mono text-xs text-muted-foreground">{entry.email}</p>
                      <TempPasswordReveal password={entry.temp_password} />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center transition-colors duration-200 hover:border-primary/50 hover:bg-muted/50"
            >
              <FileSpreadsheet className="size-8 text-muted-foreground" aria-hidden />
              <span className="text-sm font-medium">
                {file ? file.name : "Chọn tệp CSV từ máy tính"}
              </span>
              <span className="text-xs text-muted-foreground">
                {file
                  ? `${(file.size / 1024).toFixed(0)} KB — bấm để chọn tệp khác`
                  : "Hỗ trợ .csv, mỗi dòng một người dùng"}
              </span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              aria-label="Chọn tệp CSV"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        )}

        <DialogFooter>
          {result ? (
            <Button type="button" onClick={() => onOpenChange(false)}>
              Hoàn tất
            </Button>
          ) : (
            <>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Hủy
              </Button>
              <Button type="button" onClick={handleUpload} disabled={!file || submitting}>
                <Upload aria-hidden /> {submitting ? "Đang tải lên…" : "Tải lên và nhập"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
