import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
    // HTTP qua IP LAN không có Clipboard API — dùng textarea tạm.
    const area = document.createElement("textarea");
    area.value = value;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function onCopy() {
    if (await copyText(value)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } else toast.error("Không sao chép được. Hãy chọn và sao chép thủ công.");
  }
  return <Button type="button" size="xs" variant="ghost" onClick={onCopy} aria-label={`Sao chép ${label}`}>
    {copied ? <Check aria-hidden /> : <Copy aria-hidden />}{copied ? "Đã chép" : "Chép"}
  </Button>;
}

/** Khối input/output dạng monospace, có nút sao chép tùy chọn. */
export function IoBlock({ label, value, copy = false, tone }: {
  label: string; value: string | null | undefined; copy?: boolean; tone?: "danger" | "success";
}) {
  return <div className="min-w-0">
    <div className="flex h-7 items-center justify-between gap-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {copy && value ? <CopyButton value={value} label={label.toLowerCase()} /> : null}
    </div>
    <pre className={cn("max-h-56 overflow-auto rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs leading-5 whitespace-pre",
      tone === "danger" && "border-destructive/40", tone === "success" && "border-success/40")}>
      {value ? value : <span className="font-sans text-muted-foreground italic">(trống)</span>}
    </pre>
  </div>;
}
