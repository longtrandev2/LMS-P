import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Thanh tiêu đề dính: quay lại ngân hàng, tiêu đề, trạng thái lưu, nút Lưu. */
export function EditorHeader({ backHref, bankName, title, version, dirty, saving, onSave, children }: {
  backHref: string; bankName: string; title: string; version: number | null; dirty: boolean;
  saving?: boolean; onSave?: () => void; children?: React.ReactNode;
}) {
  const status = version == null ? "Chưa lưu" : dirty ? `Có thay đổi chưa lưu · phiên bản ${version}` : `Đã lưu phiên bản ${version}`;
  return <div className="sticky top-20 z-10 -mx-4 border-b bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 xl:-mx-10 xl:px-10">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <Link to={backHref} className="inline-flex max-w-full items-center gap-1.5 rounded text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40">
          <ArrowLeft className="size-3.5 shrink-0" aria-hidden /><span className="truncate">{bankName}</span>
        </Link>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="font-heading text-xl font-semibold tracking-tight">{title}</h1>
          <span role="status" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span aria-hidden className={cn("size-1.5 rounded-full", version != null && !dirty ? "bg-success" : "bg-gold")} />{status}
          </span>
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
