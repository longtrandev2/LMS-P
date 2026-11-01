import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DataTablePaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/** Phân trang chuẩn envelope {items,total,page,limit} — đặt dưới bảng, viền trên 1px. */
export function DataTablePagination({ page, limit, total, onPageChange, className }: DataTablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className={cn("flex items-center justify-between gap-4 border-t px-4 py-2.5", className)}>
      <p className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
        {from}–{to} trên {total}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Trang trước"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft aria-hidden />
        </Button>
        <span className="min-w-12 text-center text-xs text-muted-foreground tabular-nums">
          {page} / {totalPages}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Trang sau"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight aria-hidden />
        </Button>
      </div>
    </div>
  );
}
