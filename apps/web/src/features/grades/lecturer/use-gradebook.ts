import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { GradeComponent, GradeImportPreview, GradeImportRow, GradePolicy, Gradebook } from "@/types/api";
import { saveBlob } from "./grade-csv";

/** GET /classes/{id}/gradebook — `{policy, items}` (api-spec §8). */
export function useGradebook(classId: string) {
  return useQuery({
    queryKey: queryKeys.grades.gradebook(classId),
    queryFn: ({ signal }) => api.get<Gradebook>(`/classes/${classId}/gradebook`, undefined, signal),
  });
}

function useRefresh(classId: string) {
  const client = useQueryClient();
  return () => Promise.all([
    client.invalidateQueries({ queryKey: queryKeys.grades.gradebook(classId) }),
    client.invalidateQueries({ queryKey: queryKeys.grades.policy(classId) }),
  ]);
}

export function useGradeMutations(classId: string) {
  const refresh = useRefresh(classId);
  const done = { onSuccess: () => { void refresh(); } };
  return {
    /** PUT /classes/{id}/grade-policy — tổng trọng số phải = 100. */
    savePolicy: useMutation({ mutationFn: (policy: GradePolicy) => api.put<GradePolicy>(`/classes/${classId}/grade-policy`, policy), ...done }),
    /** PUT /classes/{id}/grades/{studentId}/{component} — `score: null` xóa ghi đè. */
    override: useMutation({
      mutationFn: ({ studentId, component, score, reason }: { studentId: number; component: GradeComponent; score: number | null; reason: string | null }) =>
        api.put(`/classes/${classId}/grades/${studentId}/${component}`, { score, reason }),
      ...done,
    }),
    preview: useMutation({
      mutationFn: (rows: GradeImportRow[]) => api.post<GradeImportPreview>(`/classes/${classId}/grades/import/preview`, { rows }),
    }),
    importRows: useMutation({
      mutationFn: (rows: GradeImportRow[]) =>
        api.post<{ imported: number; errors: { row: number; reason: string }[] }>(`/classes/${classId}/grades/import`, { rows }),
      ...done,
    }),
  };
}

/** GET /classes/{id}/gradebook/export — CSV UTF-8 có BOM. */
export async function exportGradebook(classId: string, fallbackName: string): Promise<void> {
  const { blob, filename } = await api.download(`/classes/${classId}/gradebook/export`);
  saveBlob(blob, filename ?? fallbackName);
}
