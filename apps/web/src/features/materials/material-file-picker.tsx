import { useState } from "react";
import { FileUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatBytes } from "./format";

/** Ô chọn tệp gọn: bấm hoặc kéo thả; đã chọn thì hiện tên + dung lượng + nút bỏ chọn. */
export function MaterialFilePicker({ id, file, accept, maxMb, invalid, onChange }: {
  id: string;
  file: File | null;
  accept: string;
  maxMb: number;
  invalid?: boolean;
  onChange: (file: File | null) => void;
}) {
  const [dragging, setDragging] = useState(false);

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-secondary px-3 py-2.5">
        <FileUp className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="text-xs text-muted-foreground tabular-nums">{formatBytes(file.size)}</p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Bỏ chọn tệp" onClick={() => onChange(null)}><X aria-hidden /></Button>
      </div>
    );
  }

  return (
    <label
      htmlFor={id}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); onChange(e.dataTransfer.files?.[0] ?? null); }}
      className={cn(
        "flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed border-input px-4 py-6 text-center transition-colors duration-150 hover:bg-secondary/60 has-focus-visible:ring-2 has-focus-visible:ring-ring",
        dragging && "bg-secondary", invalid && "border-destructive",
      )}
    >
      <FileUp className="size-5 text-muted-foreground" strokeWidth={1.75} aria-hidden />
      <span className="text-sm font-medium">Chọn tệp hoặc kéo thả vào đây</span>
      <span className="text-xs text-muted-foreground">PDF, Word, PowerPoint, ZIP, video · tối đa {maxMb} MB</span>
      <input id={id} type="file" accept={accept} className="sr-only" aria-invalid={invalid}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
    </label>
  );
}
