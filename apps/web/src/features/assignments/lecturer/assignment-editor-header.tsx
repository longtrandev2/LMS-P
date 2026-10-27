import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Header dính của trang soạn đề (DESIGN.md §4): quay lại tab Bài tập · tiêu đề · trạng thái ·
 * nút xám phụ + nút đen chính. Lề âm khớp padding của `<main>` (px-4 / sm:px-8).
 */
export function AssignmentEditorHeader({ backHref, backLabel, title, badges, dirty, isNew, children }: {
  backHref: string; backLabel: string; title: string; badges?: React.ReactNode; dirty: boolean; isNew: boolean; children: React.ReactNode;
}) {
  const saved = !isNew && !dirty;
  const status = isNew ? "Chưa lưu" : dirty ? "Có thay đổi chưa lưu" : "Đã lưu";
  return <div className="sticky top-12 z-20 -mx-4 -mt-6 border-b bg-background px-4 sm:-mx-8 sm:-mt-8 sm:px-8">
    <div className="mx-auto flex min-h-14 max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <Button asChild variant="ghost" size="icon-sm" className="-ml-1.5 shrink-0">
          <Link to={backHref} aria-label={`Quay lại ${backLabel}`} title={backLabel}><ArrowLeft aria-hidden /></Link>
        </Button>
        <h1 className="truncate text-[15px] font-semibold">{title}</h1>
        {badges ? <div className="hidden shrink-0 items-center gap-1.5 sm:flex">{badges}</div> : null}
        <span role="status" className="ml-1 inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          <span aria-hidden className={cn("size-1.5 rounded-full", saved ? "bg-success" : "bg-warning")} />{status}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  </div>;
}
