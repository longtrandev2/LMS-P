import { useState } from "react";
import { toast } from "sonner";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import { downloadMaterial, useMaterials } from "@/features/materials/use-materials";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import type { ClassSession } from "@/types/api";
import { saveBlob } from "./use-student-schedule";

/** Cột Học liệu của bảng buổi học: mỗi học liệu gắn buổi là một link tải (link ngoài mở tab mới). */
export function SessionMaterials({ classId, items }: { classId: string; items: ClassSession["materials"] }) {
  const materials = useMaterials(classId);
  const [busy, setBusy] = useState<number | null>(null);
  if (items.length === 0) return <span className="text-muted-foreground">—</span>;

  async function open(item: ClassSession["materials"][number]) {
    setBusy(item.id);
    try {
      const full = materials.data?.items.find((m) => m.id === item.id);
      if (full) await downloadMaterial(full);
      else {
        const { blob, filename } = await api.download(`/materials/${item.id}/download`);
        saveBlob(blob, filename ?? item.title);
      }
    } catch (error) {
      toast.error(errorText(error));
    } finally {
      setBusy(null);
    }
  }

  return (
    <ul className="flex max-w-56 flex-col gap-1">
      {items.map((item) => {
        const Icon = busy === item.id ? Loader2 : item.type === "link" ? ExternalLink : Download;
        return (
          <li key={item.id}>
            <button type="button" onClick={() => open(item)} disabled={busy === item.id} title={item.title}
              className="inline-flex max-w-full items-center gap-1.5 rounded-sm text-left text-[13px] text-foreground/90 underline-offset-4 transition-colors duration-150 outline-none hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring">
              <Icon className={busy === item.id ? "size-3.5 shrink-0 animate-spin" : "size-3.5 shrink-0 text-muted-foreground"} aria-hidden />
              <span className="truncate">{item.title}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
