import { Fragment, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MetaItem { icon: LucideIcon; text: ReactNode; className?: string; title?: string }

/** Hàng meta kiểu Frappe: `icon 16px + chữ` ngăn bằng dấu `·` (DESIGN.md §4 "Đầu trang"). */
export function MetaRow({ items, className }: { items: (MetaItem | null | false)[]; className?: string }) {
  const shown = items.filter((item): item is MetaItem => Boolean(item));
  return <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground", className)}>
    {shown.map(({ icon: Icon, text, className: itemClass, title }, index) => <Fragment key={index}>
      {index > 0 ? <span aria-hidden className="text-muted-foreground/60">·</span> : null}
      <span className={cn("inline-flex items-center gap-1.5 tabular-nums", itemClass)} title={title}>
        <Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />{text}
      </span>
    </Fragment>)}
  </div>;
}

/** Danh sách `icon + chữ` trong panel phụ (kiểu thẻ "Manage Batch" của Frappe). */
export function FactList({ items }: { items: (MetaItem | null | false)[] }) {
  const shown = items.filter((item): item is MetaItem => Boolean(item));
  return <ul className="space-y-2.5 text-sm">
    {shown.map(({ icon: Icon, text, className: itemClass, title }, index) => <li key={index} title={title}
      className={cn("flex items-start gap-2.5", itemClass)}>
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden />
      <span className="min-w-0 tabular-nums">{text}</span>
    </li>)}
  </ul>;
}
