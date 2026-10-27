import { useRef } from "react";
import { FileText, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/features/materials/format";

export const EVIDENCE_ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx";
const EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "webp", "doc", "docx"];
export const EVIDENCE_MAX_BYTES = 5 * 1024 * 1024;

/** Kiểm tra tệp minh chứng ở client (spec §4): đúng định dạng, ≤ 5 MB. Trả lỗi tiếng Việt hoặc null. */
export function validateEvidence(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!EXTENSIONS.includes(ext)) return "Chỉ nhận tệp PDF, JPG, PNG, WEBP, DOC hoặc DOCX.";
  if (file.size > EVIDENCE_MAX_BYTES) return `Tệp ${formatBytes(file.size)} vượt quá giới hạn 5 MB.`;
  if (file.size === 0) return "Tệp rỗng, vui lòng chọn tệp khác.";
  return null;
}

/** Chọn đúng một tệp minh chứng; hiện tên + dung lượng, cho bỏ chọn. */
export function EvidencePicker({ id, file, error, onChange, disabled }: {
  id: string;
  file: File | null;
  error?: string | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-1.5">
      <input ref={input} id={id} type="file" accept={EVIDENCE_ACCEPT} className="sr-only" disabled={disabled}
        aria-invalid={error ? true : undefined} aria-describedby={`${id}-hint`}
        onChange={(event) => { onChange(event.target.files?.[0] ?? null); event.target.value = ""; }} />
      {file ? (
        <div className="flex items-center gap-3 rounded-md bg-secondary px-3 py-2">
          <FileText className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground tabular-nums">{formatBytes(file.size)}</p>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(null)} disabled={disabled} aria-label="Bỏ tệp đã chọn">
            <X aria-hidden />
          </Button>
        </div>
      ) : (
        <Button type="button" variant="secondary" onClick={() => input.current?.click()} disabled={disabled}>
          <Paperclip aria-hidden /> Chọn tệp
        </Button>
      )}
      <p id={`${id}-hint`} className={error ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
        {error ?? "Một tệp PDF, ảnh (JPG, PNG, WEBP) hoặc Word, tối đa 5 MB."}
      </p>
    </div>
  );
}
