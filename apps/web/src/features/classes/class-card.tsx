import { Link } from "react-router-dom";
import type { ClassSummary } from "@/types/api";

/**
 * Thẻ lớp gọn cho trang chủ theo vai trò: mã (mono) · học kỳ, tên lớp, học phần, dòng meta.
 * Cả thẻ là một liên kết; không vạch màu, không icon bubble.
 */
export function ClassCard({ clazz, href, openCount, meta }: {
  clazz: ClassSummary;
  href: string;
  /** Số bài đang mở (undefined = chưa tải). */
  openCount?: number;
  /** Dòng phụ cuối thẻ (vd. GV hoặc sĩ số). */
  meta?: React.ReactNode;
}) {
  return (
    <Link
      to={href}
      className="group flex h-full flex-col gap-3 rounded-xl border bg-card p-4 transition-colors duration-150 outline-none hover:border-input hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="truncate font-mono font-medium text-foreground">{clazz.code}</span>
        <span className="shrink-0 font-mono">{clazz.semester}</span>
      </div>
      <div className="min-w-0">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{clazz.name}</h3>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{clazz.course_name}</p>
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
        <span className="min-w-0 truncate">{meta}</span>
        {openCount === undefined ? null : (
          <span className={openCount > 0 ? "shrink-0 font-medium text-foreground tabular-nums" : "shrink-0 tabular-nums"}>
            {openCount > 0 ? `${openCount} bài đang mở` : "Không có bài mở"}
          </span>
        )}
      </div>
    </Link>
  );
}
