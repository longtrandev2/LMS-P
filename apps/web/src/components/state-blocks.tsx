import { AlertCircle, Inbox, RefreshCw, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { errorText } from "@/lib/error-messages";

/**
 * Trạng thái trang — DESIGN.md §6: skeleton đúng hình nội dung → empty (icon nét 20px muted,
 * 1 câu giải thích, 1 hành động) → error (thông điệp + "Thử lại"). Không icon trong bong bóng màu.
 */

/** Skeleton cho bảng: hàng header mảnh + các hàng 44px. */
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div aria-busy="true" aria-label="Đang tải" className="divide-y">
      <div className="flex h-9 items-center gap-6 px-4">
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton key={c} className={cn("h-3 flex-1", c === 0 ? "max-w-40" : "max-w-24")} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex h-11 items-center gap-6 px-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cn("h-3.5 flex-1", c === 0 ? "max-w-56" : "max-w-28")} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Skeleton cho danh sách hàng (học liệu, bài tập…). */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Đang tải" className="divide-y">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="size-5 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Skeleton cho lưới thẻ. */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Đang tải" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-xl border bg-card p-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
  /** Icon nét Lucide (mặc định Inbox). */
  icon?: LucideIcon;
  className?: string;
}

export function EmptyState({ title, description, action, compact = false, icon: Icon = Inbox, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 px-6 text-center", compact ? "py-8" : "py-14", className)}>
      <Icon className="size-5 text-muted-foreground" strokeWidth={1.75} aria-hidden />
      <p className="text-sm font-medium">{title}</p>
      {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ error, onRetry, className }: ErrorStateProps) {
  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center gap-2 px-6 py-14 text-center", className)}>
      <AlertCircle className="size-5 text-destructive" strokeWidth={1.75} aria-hidden />
      <p className="text-sm font-medium">Không tải được dữ liệu</p>
      <p className="max-w-sm text-sm text-muted-foreground">{errorText(error)}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          <RefreshCw aria-hidden /> Thử lại
        </Button>
      ) : null}
    </div>
  );
}
