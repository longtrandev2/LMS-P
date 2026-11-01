import { cn } from "@/lib/utils";

/** Tiêu đề section 16/600 + số đếm xám + hành động phải (vd. "Xem tất cả"). Không khung. */
export function SectionHeading({ id, title, count, action, className }: {
  id?: string;
  title: string;
  count?: number;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-8 items-center justify-between gap-3", className)}>
      <h2 id={id} className="text-base font-semibold">
        {title}
        {count != null ? <span className="ml-2 text-sm font-normal text-muted-foreground tabular-nums">{count}</span> : null}
      </h2>
      {action}
    </div>
  );
}

/** Liên kết phụ màu xám ("Xem tất cả") — dạng nút khi điều hướng trong trang. */
export function ViewAllButton({ onClick, children = "Xem tất cả" }: { onClick: () => void; children?: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className="rounded-sm text-sm text-muted-foreground transition-colors duration-150 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
      {children}
    </button>
  );
}
