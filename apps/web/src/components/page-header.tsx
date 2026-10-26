import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Hành động bên phải (tối đa một nút `cta`). */
  actions?: React.ReactNode;
  /** Dòng meta phụ dưới tiêu đề (mã mono, học kỳ, badge trạng thái…). */
  meta?: React.ReactNode;
  className?: string;
}

/**
 * Tiêu đề trang — DESIGN.md §2, §4: 24/600 tracking chặt, mô tả 14 muted, hành động bên phải.
 * Breadcrumb đã có ở topbar nên không lặp link "quay lại" ở đây.
 */
export function PageHeader({ title, description, actions, meta, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-x-6 gap-y-3", className)}>
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
        {meta ? <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">{meta}</div> : null}
        {description ? <p className="max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
