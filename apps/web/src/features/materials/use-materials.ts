import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Paginated } from "@/types/api";
import type { Material } from "./types";

/** GET /classes/{id}/materials — page envelope (api-spec §4) */
export function useMaterials(classId: string) {
  return useQuery({
    queryKey: queryKeys.materials.list(classId),
    queryFn: ({ signal }) =>
      api.get<Paginated<Material>>(`/classes/${classId}/materials`, { page: 1, limit: 100 }, signal),
  });
}

/** POST /classes/{id}/materials — multipart (tệp) hoặc link_url (liên kết) */
export function useUploadMaterial(classId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (form: FormData) => api.upload<Material>(`/classes/${classId}/materials`, form),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.materials.list(classId) }),
  });
}

/** PATCH /materials/{id} — sửa metadata */
export function useUpdateMaterial(classId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      title,
      description,
      type,
    }: {
      id: number;
      title: string;
      description: string;
      type: Material["type"];
    }) => api.patch<Material>(`/materials/${id}`, { title, description, type }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.materials.list(classId) }),
  });
}

/** DELETE /materials/{id} */
export function useDeleteMaterial(classId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/materials/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.materials.list(classId) }),
  });
}

/**
 * GET /materials/{id}/download → blob rồi trigger tải về.
 * Material dạng link: mở URL ở tab mới (không qua stream).
 */
export async function downloadMaterial(material: Material): Promise<void> {
  if (material.type === "link") {
    const url = material.file_path ?? "";
    if (!/^https?:\/\//i.test(url)) throw new Error("Liên kết không hợp lệ.");
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  const { blob, filename } = await api.download(`/materials/${material.id}/download`);
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename ?? material.title;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
