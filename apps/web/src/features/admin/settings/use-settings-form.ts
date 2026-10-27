import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import { queryKeys } from "@/lib/query-keys";
import type { SettingKey, SettingView } from "@/types/admin";
import {
  type SettingsDraft, type SettingsMap, changedKeys, draftFrom, toMap, validateDraft, valuesFrom,
} from "./settings-model";

interface SettingsResponse { items: SettingView[] }

/** Trạng thái form Cấu hình: bản nháp, thay đổi so với server, lỗi client + lỗi server theo khóa. */
export function useSettingsForm(enabled: boolean) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.admin.settings,
    queryFn: ({ signal }) => api.get<SettingsResponse>("/admin/settings", undefined, signal),
    enabled,
  });
  const map: SettingsMap = useMemo(() => toMap(query.data?.items ?? []), [query.data]);
  const [draft, setDraft] = useState<SettingsDraft | null>(null);
  const [serverErrors, setServerErrors] = useState<Partial<Record<SettingKey, string>>>({});
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // Khởi tạo bản nháp khi tải lần đầu (không ghi đè khi người dùng đang sửa).
  useEffect(() => {
    if (query.data && draft === null) setDraft(draftFrom(toMap(query.data.items)));
  }, [query.data, draft]);

  const values = useMemo(() => (draft ? valuesFrom(draft) : null), [draft]);
  const changes = useMemo(() => (values ? changedKeys(map, values) : []), [map, values]);
  const clientErrors = useMemo(() => (draft ? validateDraft(draft) : {}), [draft]);
  const dirty = changes.length > 0;

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const save = useMutation({
    mutationFn: (reason: string) => {
      if (!values) throw new Error("Chưa tải cấu hình.");
      const payload = Object.fromEntries(changes.map((key) => [key, values[key]]));
      return api.put<SettingsResponse>("/admin/settings", { values: payload, reason: reason.trim() || undefined });
    },
    onSuccess: (data) => {
      client.setQueryData(queryKeys.admin.settings, data);
      void client.invalidateQueries({ queryKey: queryKeys.admin.publicSettings });
      setDraft(draftFrom(toMap(data.items)));
      setServerErrors({});
      const at = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
      setSavedAt(at);
      toast.success(`Đã lưu ${changes.length} thay đổi cấu hình.`);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "VALIDATION_ERROR" && error.details) {
        setServerErrors(Object.fromEntries(Object.entries(error.details).map(([k, v]) => [k, String(v)])));
        toast.error("Có giá trị chưa hợp lệ — xem lỗi ở từng ô. Chưa khóa nào được lưu.");
      } else toast.error(errorText(error));
    },
  });

  /** Cập nhật bản nháp; xóa lỗi server của khóa vừa sửa. */
  function update(patch: (current: SettingsDraft) => SettingsDraft, key?: SettingKey) {
    setDraft((current) => (current ? patch(current) : current));
    if (key) setServerErrors((errors) => (errors[key] ? { ...errors, [key]: undefined } : errors));
    setSavedAt(null);
  }

  function reset() {
    setDraft(draftFrom(map));
    setServerErrors({});
  }

  return { query, map, draft, changes, values, clientErrors, serverErrors, dirty, save, update, reset, savedAt };
}

export type SettingsForm = ReturnType<typeof useSettingsForm>;
