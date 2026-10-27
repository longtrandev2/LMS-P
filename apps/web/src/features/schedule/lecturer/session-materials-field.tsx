import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { MATERIAL_TYPE_META, type Material } from "@/features/materials/types";
import { useMaterials } from "@/features/materials/use-materials";
import { cn } from "@/lib/utils";

/** Học liệu kèm `session_id` (api-spec §4). */
type SessionMaterial = Material & { session_id?: number | null };

/** Trạng thái chọn học liệu cho một buổi; chỉ những mục người dùng đổi mới sinh PATCH. */
export function useSessionMaterials(classId: string, sessionId: number | null) {
  const query = useMaterials(classId);
  const [touched, setTouched] = useState<Record<number, boolean>>({});
  const items = (query.data?.items ?? []) as SessionMaterial[];
  const attached = (m: SessionMaterial) => sessionId != null && m.session_id === sessionId;
  const isChecked = (m: SessionMaterial) => touched[m.id] ?? attached(m);
  return {
    items, loading: query.isPending, sessionId, isChecked,
    toggle: (m: SessionMaterial, value: boolean) => setTouched((t) => ({ ...t, [m.id]: value })),
    changes: (savedId: number) => items
      .filter((m) => touched[m.id] !== undefined && touched[m.id] !== attached(m))
      .map((m) => ({ materialId: m.id, sessionId: touched[m.id] ? savedId : null })),
  };
}

export function SessionMaterialsField({ state, className }: { state: ReturnType<typeof useSessionMaterials>; className?: string }) {
  return (
    <fieldset className={cn("space-y-2", className)}>
      <legend className="mb-2 text-sm font-medium">Học liệu của buổi <span className="font-normal text-muted-foreground">(chọn từ học liệu của lớp)</span></legend>
      {state.loading ? <Skeleton className="h-16 w-full" />
        : state.items.length === 0 ? <p className="text-sm text-muted-foreground">Lớp chưa có học liệu. Tải học liệu ở tab Học liệu rồi gắn vào buổi.</p>
        : (
          <ul className="max-h-44 divide-y overflow-y-auto rounded-lg bg-secondary/50">
            {state.items.map((m) => {
              const Icon = MATERIAL_TYPE_META[m.type]?.icon;
              const elsewhere = m.session_id != null && m.session_id !== state.sessionId;
              return (
                <li key={m.id}>
                  <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent/60">
                    <Checkbox checked={state.isChecked(m)} onCheckedChange={(v) => state.toggle(m, v === true)} />
                    {Icon ? <Icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden /> : null}
                    <span className="min-w-0 flex-1 truncate">{m.title}</span>
                    {elsewhere ? <span className="shrink-0 text-xs text-muted-foreground">Đang gắn buổi khác</span> : null}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
    </fieldset>
  );
}
