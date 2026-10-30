import { Download, ExternalLink, Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MATERIAL_TYPE_META, type Material } from "./types";
import { formatBytes, formatMaterialDate } from "./format";

/** Hàng học liệu (pattern Danh sách): icon loại · tiêu đề + mô tả/kích thước/ngày xám · nút tải (ghost) · menu `…`. */
export function MaterialRow({ material, canManage, downloading, onDownload, onEdit, onDelete }: {
  material: Material;
  canManage: boolean;
  downloading: boolean;
  onDownload: (m: Material) => void;
  onEdit: (m: Material) => void;
  onDelete: (m: Material) => void;
}) {
  const meta = MATERIAL_TYPE_META[material.type] ?? MATERIAL_TYPE_META.other;
  const isLink = material.type === "link";
  const action = isLink ? "Mở" : "Tải về";
  return (
    <li className="border-b">
      <div className="group -mx-2 flex min-h-14 items-center gap-3 rounded-md px-2 py-2 transition-colors duration-150 hover:bg-secondary/60 has-aria-expanded:bg-secondary/60">
        <meta.icon className="size-[18px] shrink-0 text-muted-foreground" strokeWidth={1.75} aria-label={meta.label} />
        <div className="min-w-0 flex-1">
          <button type="button" onClick={() => onDownload(material)} disabled={downloading}
            className="block max-w-full truncate rounded-sm text-left text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
            {material.title}
          </button>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {material.description ? <><span>{material.description}</span><span aria-hidden> · </span></> : null}
            <span className="tabular-nums">{isLink ? "Liên kết ngoài" : `${meta.label} · ${formatBytes(material.size_bytes)}`}</span>
            <span aria-hidden> · </span>
            <span className="tabular-nums">{formatMaterialDate(material.created_at)}</span>
          </p>
        </div>
        <div className="inline-flex items-center gap-0.5">
          <Button variant="ghost" size="icon-xs" disabled={downloading} onClick={() => onDownload(material)}
            aria-label={`${action} ${material.title}`} title={action} className="text-muted-foreground hover:text-foreground">
            {downloading ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : isLink ? <ExternalLink className="size-3.5" aria-hidden /> : <Download className="size-3.5" aria-hidden />}
          </Button>
          {canManage ? (
            <>
              <Button variant="ghost" size="icon-xs" title="Sửa thông tin" aria-label={`Sửa ${material.title}`} onClick={() => onEdit(material)} className="text-muted-foreground hover:text-foreground">
                <Pencil className="size-3.5" aria-hidden />
              </Button>
              <Button variant="ghost" size="icon-xs" title="Xóa học liệu" aria-label={`Xóa ${material.title}`} onClick={() => onDelete(material)} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="size-3.5" aria-hidden />
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </li>
  );
}
