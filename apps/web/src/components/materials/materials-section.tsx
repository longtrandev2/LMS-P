"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/state-blocks";
import { errorText } from "@/lib/error-messages";
import { MATERIAL_TYPE_META, type Material } from "./types";
import { formatBytes, formatMaterialDate } from "./format";
import { downloadMaterial, useMaterials } from "./use-materials";
import { UploadMaterialDialog } from "./upload-material-dialog";
import { EditMaterialDialog } from "./edit-material-dialog";
import { DeleteMaterialButton } from "./delete-material-button";

interface MaterialsSectionProps {
  classId: string;
  /** Lecturer/admin: hiện nút tải lên, sửa, xóa (FR-MAT-01/03) */
  canManage: boolean;
}

function MaterialRow({
  material,
  classId,
  canManage,
  downloading,
  onDownload,
  onEdit,
}: {
  material: Material;
  classId: string;
  canManage: boolean;
  downloading: boolean;
  onDownload: (m: Material) => void;
  onEdit: (m: Material) => void;
}) {
  const meta = MATERIAL_TYPE_META[material.type] ?? MATERIAL_TYPE_META.other;
  const Icon = meta.icon;
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
      <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{material.title}</p>
        {material.description ? (
          <p className="truncate text-xs text-muted-foreground">{material.description}</p>
        ) : null}
        <p className="mt-0.5 text-xs text-muted-foreground">
          {meta.label} · {material.type === "link" ? "Liên kết ngoài" : formatBytes(material.size_bytes)} ·{" "}
          {formatMaterialDate(material.created_at)}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={downloading}
          onClick={() => onDownload(material)}
        >
          <Download aria-hidden />
          {downloading ? "Đang tải…" : material.type === "link" ? "Mở" : "Tải về"}
        </Button>
        {canManage ? (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Sửa học liệu ${material.title}`}
              onClick={() => onEdit(material)}
            >
              <Pencil aria-hidden />
            </Button>
            <DeleteMaterialButton classId={classId} material={material} />
          </>
        ) : null}
      </div>
    </li>
  );
}

/** Danh sách học liệu của lớp — dùng chung cho trang class detail (lec/adm) và trang lớp của sinh viên */
export function MaterialsSection({ classId, canManage }: MaterialsSectionProps) {
  const list = useMaterials(classId);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  async function handleDownload(material: Material) {
    setDownloadingId(material.id);
    try {
      await downloadMaterial(material);
    } catch (error) {
      toast.error(error instanceof Error && error.message === "Liên kết không hợp lệ."
        ? error.message
        : errorText(error));
    } finally {
      setDownloadingId(null);
    }
  }

  const materials = list.data?.items ?? [];

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
          <p className="text-sm font-semibold">
            Học liệu
            {list.data ? (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {list.data.total} mục
              </span>
            ) : null}
          </p>
          {canManage ? (
            <Button size="sm" onClick={() => setUploadOpen(true)}>
              <Plus aria-hidden /> Tải lên
            </Button>
          ) : null}
        </div>

        {list.isPending ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        ) : materials.length === 0 ? (
          <EmptyState
            title="Chưa có học liệu nào"
            description={
              canManage
                ? "Tải tệp lên hoặc dán liên kết để chia sẻ tài liệu cho lớp."
                : "Giảng viên chưa chia sẻ học liệu cho lớp này."
            }
            action={
              canManage ? (
                <Button onClick={() => setUploadOpen(true)}>
                  <Plus aria-hidden /> Tải lên học liệu
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="divide-y">
            {materials.map((material) => (
              <MaterialRow
                key={material.id}
                material={material}
                classId={classId}
                canManage={canManage}
                downloading={downloadingId === material.id}
                onDownload={handleDownload}
                onEdit={setEditing}
              />
            ))}
          </ul>
        )}
      </CardContent>

      {uploadOpen ? (
        <UploadMaterialDialog classId={classId} onOpenChange={setUploadOpen} />
      ) : null}
      {editing ? (
        <EditMaterialDialog
          key={editing.id}
          material={editing}
          classId={classId}
          onOpenChange={() => setEditing(null)}
        />
      ) : null}
    </Card>
  );
}
