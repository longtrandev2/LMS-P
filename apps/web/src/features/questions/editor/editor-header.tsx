import { Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { questionTypeLabel } from "@/lib/question-types";
import { cn } from "@/lib/utils";
import type { QuestionType } from "@/types/api";
import { TYPE_ICON } from "../question-labels";

/**
 * Header dính của trang soạn (DESIGN.md §4): quay lại · tiêu đề + loại · ngân hàng · trạng thái lưu · nút xám · nút đen Lưu.
 * Lề âm khớp padding của `<main>` (px-4 / sm:px-8) để viền dưới chạy sát mép vùng nội dung.
 */
export function EditorHeader({ backHref, bankName, title, type, version, dirty, saving, onSave, children }: {
  backHref: string; bankName: string; title: string; type: QuestionType; version: number | null; dirty: boolean;
  saving?: boolean; onSave?: () => void; children?: React.ReactNode;
}) {
  const TypeIcon = TYPE_ICON[type];
  const saved = version != null && !dirty;
  const status = version == null ? (dirty ? "Chưa lưu" : "Bản nháp mới") : dirty ? "Có thay đổi chưa lưu" : `Đã lưu · v${version}`;
  return <div className="sticky top-12 z-20 -mx-4 -mt-6 mb-8 border-b bg-background px-4 sm:-mx-8 sm:-mt-8 sm:px-8">
    <div className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
      <Button asChild variant="ghost" size="icon-sm" className="-ml-1.5 shrink-0 text-muted-foreground">
        <Link to={backHref} aria-label={`Quay lại ngân hàng ${bankName}`} title={`Về ${bankName}`}><ArrowLeft aria-hidden /></Link>
      </Button>
      <div className="flex min-w-0 flex-1 items-center gap-x-3 gap-y-1">
        <h1 className="truncate text-base font-semibold tracking-tight">{title}</h1>
        <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md bg-secondary px-2 text-xs font-medium text-secondary-foreground">
          <TypeIcon className="size-3.5" strokeWidth={1.75} aria-hidden />{questionTypeLabel(type)}
        </span>
        <span className="hidden min-w-0 truncate text-sm text-muted-foreground md:inline">{bankName}</span>
        <span role="status" className="hidden shrink-0 items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex">
          <span aria-hidden className={cn("size-1.5 rounded-full", saved ? "bg-success" : version == null && !dirty ? "bg-muted-foreground/50" : "bg-warning")} />
          {status}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {children}
        {onSave ? <>
          <Button asChild variant="outline"><Link to={backHref}>Đóng</Link></Button>
          <Button type="button" onClick={onSave} disabled={saving} aria-keyshortcuts="Control+S" title="Lưu (Ctrl+S)">
            {saving ? <Loader2 className="animate-spin" aria-hidden /> : null}{saving ? "Đang lưu…" : "Lưu"}
          </Button>
        </> : null}
      </div>
    </div>
  </div>;
}
