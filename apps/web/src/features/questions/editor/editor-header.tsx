import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Header dính của trang soạn (DESIGN.md §5): quay lại · tiêu đề · trạng thái lưu · CTA Lưu.
 * Lề âm khớp padding của `<main>` để vạch viền chạy sát mép vùng nội dung.
 */
export function EditorHeader({ backHref, bankName, title, version, dirty, saving, onSave, children }: {
  backHref: string; bankName: string; title: string; version: number | null; dirty: boolean;
  saving?: boolean; onSave?: () => void; children?: React.ReactNode;
}) {
  const saved = version != null && !dirty;
  const status = version == null ? "Chưa lưu" : dirty ? `Có thay đổi chưa lưu · phiên bản ${version}` : `Đã lưu phiên bản ${version}`;
  return <div className="sticky top-12 z-20 -mx-4 -mt-6 border-b bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mt-8 sm:px-6">
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="flex min-w-0 items-center gap-2">
        <Button asChild variant="ghost" size="icon-sm" className="shrink-0">
          <Link to={backHref} aria-label={`Quay lại ngân hàng ${bankName}`} title={bankName}><ArrowLeft aria-hidden /></Link>
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">{title}</h1>
          <p className="flex min-w-0 items-center gap-x-2 text-xs text-muted-foreground">
            <span className="truncate">{bankName}</span>
            <span aria-hidden>·</span>
            <span role="status" className="inline-flex shrink-0 items-center gap-1.5">
              <span aria-hidden className={cn("size-1.5 rounded-full", saved ? "bg-success" : "bg-warning")} />{status}
            </span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {children}
        {onSave ? <Button type="button" variant="cta" onClick={onSave} disabled={saving} aria-keyshortcuts="Control+S">
          {saving ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}{saving ? "Đang lưu…" : "Lưu"}
        </Button> : null}
      </div>
    </div>
  </div>;
}
