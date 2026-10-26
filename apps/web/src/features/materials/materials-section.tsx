import { useState } from "react";
import { toast } from "sonner";
import { FolderOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/state-blocks";
import { errorText } from "@/lib/error-messages";
import type { Material } from "./types";
import { downloadMaterial, useMaterials } from "./use-materials";
import { UploadMaterialDialog } from "./upload-material-dialog";
import { EditMaterialDialog } from "./edit-material-dialog";
import { DeleteMaterialDialog } from "./delete-material-dialog";
import { MaterialRow } from "./material-row";

interface MaterialsSectionProps {
  classId: string;
  /** Giảng viên: tải lên, sửa, xóa (FR-MAT-01/03) */
  canManage: boolean;
}

/** Danh sách học liệu của lớp — dùng chung cho workspace lớp GV và SV (pattern Danh sách). */
export function MaterialsSection({ classId, canManage }: MaterialsSectionProps) {
  const list = useMaterials(classId);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [deleting, setDeleting] = useState<Material | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  async function handleDownload(material: Material) {
    setDownloadingId(material.id);
    try {
      await downloadMaterial(material);
    } catch (error) {
      toast.error(error instanceof Error && error.message === "Liên kết không hợp lệ." ? error.message : errorText(error));
    } finally {
      setDownloadingId(null);
    }
  }

  const materials = list.data?.items ?? [];
  const uploadButton = (
    <Button size="sm" onClick={() => setUploadOpen(true)}><Plus aria-hidden /> Tải lên</Button>
  );

  return (
    <section aria-labelledby={`materials-${classId}`} className="overflow-hidden rounded-xl border bg-card">
      <header className="flex min-h-12 flex-wrap items-center justify-between gap-3 border-b px-4 py-2">
        <h2 id={`materials-${classId}`} className="text-sm font-semibold">
          Học liệu
          {list.data ? <span className="ml-2 font-normal text-muted-foreground tabular-nums">{list.data.total}</span> : null}
        </h2>
        {canManage ? uploadButton : null}
      </header>

      {list.isPending ? (
        <ListSkeleton rows={4} />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : materials.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Chưa có học liệu"
          description={canManage ? "Tải tệp lên hoặc dán liên kết để chia sẻ tài liệu cho lớp." : "Giảng viên chưa chia sẻ học liệu cho lớp này."}
          action={canManage ? uploadButton : undefined}
        />
      ) : (
        <ul className="divide-y">
          {materials.map((material) => (
            <MaterialRow
              key={material.id}
              material={material}
              canManage={canManage}
              downloading={downloadingId === material.id}
              onDownload={handleDownload}
              onEdit={setEditing}
              onDelete={setDeleting}
            />
          ))}
        </ul>
      )}

      {uploadOpen ? <UploadMaterialDialog classId={classId} onOpenChange={setUploadOpen} /> : null}
      {editing ? (
        <EditMaterialDialog key={editing.id} material={editing} classId={classId} onOpenChange={() => setEditing(null)} />
      ) : null}
      {canManage ? (
        <DeleteMaterialDialog classId={classId} material={deleting} onOpenChange={(open) => { if (!open) setDeleting(null); }} />
      ) : null}
    </section>
  );
}
