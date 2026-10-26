import { Download, ExternalLink, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MATERIAL_TYPE_META, type Material } from "./types";
import { formatBytes, formatMaterialDate } from "./format";

/** Một hàng học liệu: icon loại (nét, muted) · tên + mô tả · meta · Tải về + menu `…` (sửa/xóa). */
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
  return (
    <li className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-muted/40">
      <meta.icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{material.title}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          <span>{meta.label}</span>
          <span aria-hidden> · </span>
          <span className="tabular-nums">{isLink ? "Liên kết ngoài" : formatBytes(material.size_bytes)}</span>
          <span aria-hidden> · </span>
          <span className="tabular-nums">{formatMaterialDate(material.created_at)}</span>
          {material.description ? <><span aria-hidden> · </span><span>{material.description}</span></> : null}
        </p>
      </div>
      <Button variant="outline" size="sm" disabled={downloading} onClick={() => onDownload(material)}
        aria-label={`${isLink ? "Mở" : "Tải về"} ${material.title}`}>
        {isLink ? <ExternalLink aria-hidden /> : <Download aria-hidden />}
        <span className="hidden sm:inline">{downloading ? "Đang tải…" : isLink ? "Mở" : "Tải về"}</span>
      </Button>
      {canManage ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Thao tác với ${material.title}`}>
              <MoreHorizontal aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(material)}><Pencil aria-hidden /> Sửa thông tin</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(material)}><Trash2 aria-hidden /> Xóa học liệu</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </li>
  );
}
