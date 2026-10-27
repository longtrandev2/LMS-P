import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import { queryKeys } from "@/lib/query-keys";
import { toAssignmentInput, toPublishedSettings, type EditorForm, type EditorMode } from "./editor-model";
import { hasBlueprintDetails, toPublishIssue, type PublishIssue } from "@/features/exams/lecturer/blueprint/publish-issue";
import type { AssignmentDetails } from "@/types/api";

export type SaveAction = "draft" | "publish";
export type ConflictCode = "PROBLEM_UNVERIFIED" | "PROBLEM_CHECK_FAILED";
export interface PublishConflict { code: ConflictCode; message: string; questionIds: number[] }

/** Lấy mọi `question_id`/`question_ids` trong `error.details` (hình dạng chưa chốt ở api-spec). */
export function conflictQuestionIds(details: Record<string, unknown> | undefined): number[] {
  const ids = new Set<number>();
  const visit = (value: unknown, key: string) => {
    if (typeof value === "number" && /question_?ids?$/i.test(key)) ids.add(value);
    else if (Array.isArray(value)) value.forEach((item) => visit(item, key));
    else if (value && typeof value === "object") Object.entries(value).forEach(([k, v]) => visit(v, k));
  };
  visit(details, "");
  return [...ids];
}

/**
 * Lưu đề: tạo mới → `POST /assignments/bulk`; nháp → `PATCH /assignments/{id}` (+ `POST …/publish`);
 * đã xuất bản → `PATCH …/published-settings`. 409 PROBLEM_* chuyển thành `conflict` để hiện AlertDialog.
 */
export function useSaveAssignment({ mode, assignmentId, onSaved, onDraftPersisted }: {
  mode: EditorMode; assignmentId: number | null;
  onSaved: (action: SaveAction, created: AssignmentDetails[] | null) => void;
  /** Nháp: PATCH đã lưu nhưng xuất bản bị chặn — form khớp bản đã lưu. */
  onDraftPersisted?: (form: EditorForm) => void;
}) {
  const client = useQueryClient();
  const [saving, setSaving] = useState<SaveAction | null>(null);
  const [conflict, setConflict] = useState<PublishConflict | null>(null);
  const [pending, setPending] = useState<{ form: EditorForm; action: SaveAction } | null>(null);
  const [issue, setIssue] = useState<PublishIssue | null>(null);

  async function save(form: EditorForm, action: SaveAction, confirmUnverified = false) {
    setSaving(action);
    setIssue(null);
    const publish = action === "publish";
    const confirm = confirmUnverified ? { confirm_unverified: true } : {};
    let persisted = false;
    try {
      let created: AssignmentDetails[] | null = null;
      if (mode === "published" && assignmentId != null) {
        await api.patch(`/assignments/${assignmentId}/published-settings`, toPublishedSettings(form));
      } else if (mode === "draft" && assignmentId != null) {
        await api.patch(`/assignments/${assignmentId}`, toAssignmentInput(form));
        persisted = true;
        if (publish) await api.post(`/assignments/${assignmentId}/publish`, confirm);
      } else {
        created = await api.post<AssignmentDetails[]>("/assignments/bulk", {
          class_ids: form.classIds, assignment: toAssignmentInput(form), publish, ...confirm,
        });
      }
      await client.invalidateQueries({ queryKey: queryKeys.assignments.all });
      setConflict(null); setPending(null); setIssue(null);
      toast.success(mode === "published" ? "Đã lưu điều chỉnh." : publish
        ? form.classIds.length > 1 && mode === "create" ? `Đã xuất bản cho ${form.classIds.length} lớp.` : "Đã xuất bản bài."
        : "Đã lưu bản nháp.");
      onSaved(action, created);
    } catch (error) {
      if (persisted) onDraftPersisted?.(form);
      if (error instanceof ApiError && (error.code === "PROBLEM_UNVERIFIED" || error.code === "PROBLEM_CHECK_FAILED")) {
        // Sửa nháp: PATCH đã thành công trước khi publish bị chặn — đề đã được lưu.
        if (mode === "draft") void client.invalidateQueries({ queryKey: queryKeys.assignments.all });
        setPending({ form, action });
        setConflict({ code: error.code, message: errorText(error), questionIds: conflictQuestionIds(error.details) });
      } else if (hasBlueprintDetails(error)) {
        // Lỗi cấu trúc đề khi xuất bản: bản nháp đã lưu — đọc lại để ánh xạ `rule_id` về quy tắc trên form.
        const saved = assignmentId != null
          ? await client.fetchQuery({ queryKey: queryKeys.assignments.details(assignmentId), staleTime: 0,
            queryFn: () => api.get<AssignmentDetails>(`/assignments/${assignmentId}`) }).catch(() => null)
          : null;
        if (mode === "draft") void client.invalidateQueries({ queryKey: queryKeys.assignments.all });
        setIssue(toPublishIssue(error, saved));
        toast.error(errorText(error));
      } else {
        toast.error(errorText(error));
      }
    } finally {
      setSaving(null);
    }
  }

  return {
    saving, conflict, issue, save,
    dismissConflict: () => { setConflict(null); setPending(null); },
    confirmUnverified: () => { if (pending) void save(pending.form, pending.action, true); },
  };
}
