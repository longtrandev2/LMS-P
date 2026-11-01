import { useId } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { errorText } from "@/lib/error-messages";
import { cn } from "@/lib/utils";

interface DashboardPanelProps {
  title: string;
  /** Dòng phụ dưới tiêu đề (đơn vị, thời điểm cập nhật…). */
  meta?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/** Khối của trang tổng quan: `rounded-xl border p-5`, tiêu đề 14/600 + meta xám, không lồng khung. */
export function DashboardPanel({ title, meta, action, className, children }: DashboardPanelProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className={cn("flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-4 sm:p-5", className)}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={headingId} className="text-sm font-semibold">{title}</h2>
          {meta ? <p className="mt-0.5 text-xs text-muted-foreground">{meta}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

/** Lỗi gọn trong khối + "Thử lại". */
export function PanelError({ error, onRetry, title = "Không tải được dữ liệu" }: { error: unknown; onRetry: () => void; title?: string }) {
  return (
    <div role="alert" className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
      <AlertCircle className="size-5 text-destructive" strokeWidth={1.75} aria-hidden />
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-xs text-sm text-muted-foreground">{errorText(error)}</p>
      <Button variant="outline" size="sm" className="mt-1" onClick={onRetry}>
        <RefreshCw aria-hidden /> Thử lại
      </Button>
    </div>
  );
}
