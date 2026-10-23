import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Khối mật khẩu tạm — hiển thị đúng 1 lần, kèm nút sao chép */
export function TempPasswordReveal({
  password,
  className,
}: {
  password: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard bị chặn — người dùng chép tay */
    }
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3",
        className
      )}
    >
      <code className="break-all font-mono text-base font-semibold">{password}</code>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Sao chép mật khẩu"
        onClick={copy}
      >
        {copied ? <Check className="text-success" aria-hidden /> : <Copy aria-hidden />}
      </Button>
    </div>
  );
}
