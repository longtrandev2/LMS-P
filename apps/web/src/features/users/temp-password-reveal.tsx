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
        "flex items-center justify-between gap-3 rounded-lg bg-secondary py-2 pr-2 pl-4",
        className
      )}
    >
      <code className="font-mono text-base font-medium tracking-wide break-all">{password}</code>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Sao chép mật khẩu"
        onClick={copy}
      >
        {copied ? <Check className="text-success" aria-hidden /> : <Copy aria-hidden />}
      </Button>
    </div>
  );
}
