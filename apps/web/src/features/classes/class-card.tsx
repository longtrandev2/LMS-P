import { Link } from "react-router-dom";
import type { ClassSummary } from "@/types/api";
import { cn } from "@/lib/utils";

/**
 * Thẻ lớp gọn (DESIGN.md §4 Trang chủ): `rounded-xl border p-4`, mã mono · học kỳ, tên 15/600,
 * học phần + meta xám, số bài đang mở. Cả thẻ là một liên kết.
 */
export function ClassCard({ clazz, href, openCount, meta }: {
  clazz: ClassSummary;
  href: string;
  /** Số bài đang mở (undefined = chưa tải). */
  openCount?: number;
  /** Dòng meta cuối thẻ (vd. GV hoặc sĩ số). */
  meta?: React.ReactNode;
}) {
  return (
    <Link
      to={href}
      className="group flex h-full flex-col rounded-xl border bg-card p-4 transition-colors duration-150 outline-none hover:bg-sidebar focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="truncate font-mono">{clazz.code}</span>
        {clazz.status === "locked" ? <span className="shrink-0 text-destructive">Đã khóa</span> : <span className="shrink-0 font-mono">{clazz.semester}</span>}
      </div>
      <h3 className="mt-2 line-clamp-2 text-[15px] leading-snug font-semibold">{clazz.name}</h3>
      <p className="mt-1 truncate text-[13px] text-muted-foreground">{clazz.course_name}</p>
      <div className="mt-auto flex items-center justify-between gap-2 pt-5 text-xs text-muted-foreground">
        <span className="min-w-0 truncate">{meta}</span>
        {openCount === undefined ? null : (
          <span className={cn("inline-flex shrink-0 items-center gap-1.5 tabular-nums", openCount > 0 && "font-medium text-foreground")}>
            {openCount > 0 ? <span className="size-1.5 rounded-full bg-success" aria-hidden /> : null}
            {openCount > 0 ? `${openCount} bài đang mở` : "Không có bài mở"}
          </span>
        )}
      </div>
    </Link>
  );
}
