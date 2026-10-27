import { Children, Fragment } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Hàng meta dưới tiêu đề (DESIGN.md §4 "Đầu trang"): các mục `icon + chữ` ngăn bằng `·`. */
export function MetaRow({ children, className }: { children: React.ReactNode; className?: string }) {
  const items = Children.toArray(children).filter(Boolean);
  return <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground tabular-nums", className)}>
    {items.map((item, index) => <Fragment key={index}>
      {index > 0 ? <span aria-hidden className="text-muted-foreground/60">·</span> : null}
      {item}
    </Fragment>)}
  </div>;
}

export function MetaItem({ icon: Icon, children, className }: { icon?: LucideIcon; children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1.5", className)}>
    {Icon ? <Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden /> : null}<span>{children}</span>
  </span>;
}
