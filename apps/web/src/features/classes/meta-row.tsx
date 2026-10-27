import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MetaItem {
  key: string;
  icon?: LucideIcon;
  content: React.ReactNode;
  /** Nhãn cho trình đọc màn hình (icon chỉ là trang trí). */
  label?: string;
}

/**
 * Hàng meta kiểu Frappe: `icon + chữ` ngăn bằng `·` (DESIGN.md §4 Đầu trang).
 * Dấu `·` đứng trước mỗi mục và bị cắt khi mục rơi xuống đầu dòng mới (wrapper `overflow-hidden`, ul `-ml-6`),
 * nên khi xuống dòng không còn dấu chấm thừa ở cuối hay đầu dòng.
 */
export function MetaRow({ items, className }: { items: MetaItem[]; className?: string }) {
  return (
    <div className={cn("overflow-hidden text-sm text-muted-foreground", className)}>
      <ul className="-ml-6 flex flex-wrap items-center gap-y-1.5">
        {items.map((item) => (
          <li key={item.key}
            className="inline-flex min-w-0 items-center gap-1.5 before:-mr-1.5 before:inline-block before:w-6 before:shrink-0 before:text-center before:text-muted-foreground/60 before:content-['·']">
            {item.icon ? <item.icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden /> : null}
            {item.label ? <span className="sr-only">{item.label}: </span> : null}
            <span className="truncate text-foreground/80">{item.content}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
