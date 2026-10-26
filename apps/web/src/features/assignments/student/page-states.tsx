import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/state-blocks";

export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return <Link to={to} className="inline-flex max-w-full items-center gap-1.5 rounded-sm text-sm text-muted-foreground transition-colors duration-150 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
    <ArrowLeft className="size-4 shrink-0" aria-hidden /><span className="truncate">{children}</span>
  </Link>;
}

export function PageSkeleton() {
  return <div className="space-y-6" aria-busy="true" aria-label="Đang tải">
    <Skeleton className="h-5 w-40" />
    <Skeleton className="h-9 w-2/3" />
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-3"><Skeleton className="h-40 rounded-xl" /><Skeleton className="h-40 rounded-xl" /></div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  </div>;
}

/** Lỗi tải trang kèm đường quay lại. */
export function PageError({ error, onRetry, back }: { error: unknown; onRetry?: () => void; back: ReactNode }) {
  return <div className="space-y-6">{back}<div className="rounded-xl border bg-card"><ErrorState error={error} onRetry={onRetry} /></div></div>;
}

export function PageNotice({ title, description, back, action }: { title: string; description?: string; back: ReactNode; action?: ReactNode }) {
  return <div className="space-y-6">{back}<div className="rounded-xl border bg-card"><EmptyState title={title} description={description} action={action} /></div></div>;
}
