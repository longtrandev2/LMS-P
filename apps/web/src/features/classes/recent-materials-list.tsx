import { MATERIAL_TYPE_META, type Material } from "@/features/materials/types";
import { formatBytes, formatMaterialDate } from "@/features/materials/format";

/** Hàng học liệu rút gọn cho tab Tổng quan: icon loại · tiêu đề · kích thước · ngày. */
export function RecentMaterialsList({ items, onOpen }: { items: Material[]; onOpen: () => void }) {
  return (
    <ul className="border-t">
      {items.map((material) => {
        const meta = MATERIAL_TYPE_META[material.type] ?? MATERIAL_TYPE_META.other;
        return (
          <li key={material.id} className="border-b">
            <button type="button" onClick={onOpen}
              className="-mx-2 flex min-h-12 w-[calc(100%+1rem)] items-center gap-3 rounded-md px-2 py-2 text-left transition-colors duration-150 outline-none hover:bg-secondary/60 focus-visible:ring-2 focus-visible:ring-ring">
              <meta.icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{material.title}</span>
              <span className="hidden shrink-0 text-xs text-muted-foreground tabular-nums sm:inline">
                {material.type === "link" ? "Liên kết" : formatBytes(material.size_bytes)}
              </span>
              <span className="w-20 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{formatMaterialDate(material.created_at)}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
