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

/** Skeleton đúng hình trang bài: tiêu đề + hàng meta, cột nội dung dạng hàng, panel phải. */
export function PageSkeleton() {
  return <div className="space-y-8" aria-busy="true" aria-label="Đang tải">
    <div className="space-y-3">
      <Skeleton className="h-7 w-2/3 max-w-md" />
      <Skeleton className="h-4 w-80 max-w-full" />
    </div>
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" />
        <div className="divide-y pt-4">
          {[0, 1, 2].map((row) => <div key={row} className="flex items-center gap-4 py-4"><Skeleton className="h-4 w-16" /><Skeleton className="h-4 flex-1" /></div>)}
        </div>
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  </div>;
}

/** Lỗi tải trang kèm đường quay lại. */
export function PageError({ error, onRetry, back }: { error: unknown; onRetry?: () => void; back: ReactNode }) {
  return <div className="space-y-6">{back}<ErrorState error={error} onRetry={onRetry} /></div>;
}

export function PageNotice({ title, description, back, action }: { title: string; description?: string; back: ReactNode; action?: ReactNode }) {
  return <div className="space-y-6">{back}<EmptyState title={title} description={description} action={action} /></div>;
}
