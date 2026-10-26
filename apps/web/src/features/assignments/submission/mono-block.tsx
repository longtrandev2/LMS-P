import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Khối chữ mono cuộn được, có nút sao chép. `tone="danger"` cho log lỗi. */
export function MonoBlock({ title, value, tone = "default", maxHeight = "max-h-64", className }: {
  title: string; value: string | null | undefined; tone?: "default" | "danger"; maxHeight?: string; className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const text = value ?? "";
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch { /* trình duyệt chặn clipboard — bỏ qua */ }
  }
  return <figure className={cn("min-w-0 overflow-hidden rounded-lg border", tone === "danger" ? "border-destructive/30" : "", className)}>
    <figcaption className={cn("flex items-center justify-between gap-2 border-b px-3 py-1.5 text-xs font-medium",
      tone === "danger" ? "border-destructive/30 bg-destructive/5 text-destructive" : "bg-muted/50 text-muted-foreground")}>
      <span>{title}</span>
      <Button type="button" variant="ghost" size="icon-xs" aria-label={copied ? `Đã sao chép ${title}` : `Sao chép ${title}`} disabled={!text} onClick={copy}>
        {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      </Button>
    </figcaption>
    <pre tabIndex={0} aria-label={title} className={cn("overflow-auto p-3 font-mono text-xs leading-5 whitespace-pre outline-none focus-visible:ring-2 focus-visible:ring-ring/40", maxHeight)}>
      {text || <span className="text-muted-foreground italic">(trống)</span>}
    </pre>
  </figure>;
}
