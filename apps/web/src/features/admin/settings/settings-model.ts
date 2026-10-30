import { GRADE_COMPONENTS } from "@/lib/grades";
import type { GradeComponent, GradePolicy } from "@/types/api";
import type { MaintenanceSetting, SettingKey, SettingView } from "@/types/admin";

/** Bản nháp của form cấu hình: số giữ dạng chuỗi để người dùng gõ tự do — docs/admin-spec.md §1. */
export type IntKey =
  | "default_time_limit_ms" | "default_memory_limit_mb" | "max_time_limit_ms" | "max_memory_limit_mb"
  | "practice_runs_per_minute" | "max_upload_mb" | "leave_evidence_max_mb" | "inactivity_timeout_minutes";
export type PenaltyKey = "absent_penalty" | "late_penalty" | "excused_penalty";

export interface SettingsDraft {
  allowed_languages: string[];
  ints: Record<IntKey, string>;
  weights: Record<GradeComponent, string>;
  max_absences: string;
  penalties: Record<PenaltyKey, string>;
  maintenance: { enabled: boolean; message: string };
}

export const INT_KEYS: IntKey[] = [
  "default_time_limit_ms", "default_memory_limit_mb", "max_time_limit_ms", "max_memory_limit_mb",
  "practice_runs_per_minute", "max_upload_mb", "leave_evidence_max_mb", "inactivity_timeout_minutes",
];
export const PENALTY_KEYS: PenaltyKey[] = ["absent_penalty", "late_penalty", "excused_penalty"];
const LANG_ORDER = ["python", "c", "cpp", "java"];

export const toDecimalText = (n: number) => String(n).replace(".", ",");
const toNum = (s: string) => (s.trim() === "" ? Number.NaN : Number(s.trim().replace(",", ".")));
const isIntText = (s: string) => /^\d+$/.test(s.trim());

export type SettingsMap = Partial<Record<SettingKey, SettingView>>;
export const toMap = (items: SettingView[]): SettingsMap => Object.fromEntries(items.map((item) => [item.key, item]));

export function draftFrom(map: SettingsMap): SettingsDraft {
  const policy = map.default_grade_policy?.value as GradePolicy | undefined;
  const maintenance = (map.maintenance?.value ?? { enabled: false }) as MaintenanceSetting;
  return {
    allowed_languages: (map.allowed_languages?.value as string[] | undefined) ?? [],
    ints: Object.fromEntries(INT_KEYS.map((k) => [k, map[k]?.value == null ? "" : String(map[k]?.value)])) as Record<IntKey, string>,
    weights: Object.fromEntries(GRADE_COMPONENTS.map((c) => [c, String(policy?.weights[c] ?? "")])) as Record<GradeComponent, string>,
    max_absences: policy?.attendance.max_absences == null ? "" : String(policy.attendance.max_absences),
    penalties: Object.fromEntries(PENALTY_KEYS.map((k) => [k, policy ? toDecimalText(policy.attendance[k]) : ""])) as Record<PenaltyKey, string>,
    maintenance: { enabled: Boolean(maintenance.enabled), message: maintenance.message ?? "" },
  };
}

/** Giá trị gửi lên server cho từng khóa (số nguyên là JSON integer; chuỗi sai định dạng giữ nguyên để server báo lỗi). */
export function valuesFrom(draft: SettingsDraft): Record<SettingKey, unknown> {
  const int = (s: string) => (isIntText(s) ? Number(s.trim()) : s.trim());
  const ints = Object.fromEntries(INT_KEYS.map((k) => [k, int(draft.ints[k])])) as Record<IntKey, unknown>;
  return {
    allowed_languages: LANG_ORDER.filter((l) => draft.allowed_languages.includes(l)),
    ...ints,
    default_grade_policy: {
      weights: Object.fromEntries(GRADE_COMPONENTS.map((c) => [c, int(draft.weights[c])])),
      attendance: {
        max_absences: draft.max_absences.trim() === "" ? null : int(draft.max_absences),
        ...Object.fromEntries(PENALTY_KEYS.map((k) => [k, Number.isNaN(toNum(draft.penalties[k])) ? draft.penalties[k] : toNum(draft.penalties[k])])),
      },
    },
    maintenance: { enabled: draft.maintenance.enabled, message: draft.maintenance.message.trim() || null },
  };
}

/** So sánh không phụ thuộc thứ tự khóa / thứ tự ngôn ngữ. */
function canonical(key: SettingKey, value: unknown): string {
  if (key === "allowed_languages" && Array.isArray(value)) return JSON.stringify([...value].sort());
  if (key === "maintenance") {
    const m = (value ?? {}) as MaintenanceSetting;
    return JSON.stringify({ enabled: Boolean(m.enabled), message: m.message?.trim() || null });
  }
  return JSON.stringify(value, (_k, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
      : v);
}

export function changedKeys(map: SettingsMap, values: Record<SettingKey, unknown>): SettingKey[] {
  return (Object.keys(values) as SettingKey[]).filter((key) => map[key] && canonical(key, map[key]?.value) !== canonical(key, values[key]));
}

/** Kiểm tra phía client: định dạng + ràng buộc chéo. Khoảng hợp lệ chi tiết do server kiểm (lỗi map về từng ô). */
export type ClientErrors = Partial<Record<string, string>>;
export function validateDraft(draft: SettingsDraft): ClientErrors {
  const errors: ClientErrors = {};
  if (draft.allowed_languages.length === 0) errors.allowed_languages = "Chọn ít nhất một ngôn ngữ.";
  for (const k of INT_KEYS) if (!isIntText(draft.ints[k])) errors[k] = "Nhập số nguyên dương.";
  const n = (k: IntKey) => Number(draft.ints[k]);
  if (!errors.default_time_limit_ms && !errors.max_time_limit_ms && n("default_time_limit_ms") > n("max_time_limit_ms"))
    errors.default_time_limit_ms = "Không được lớn hơn thời gian tối đa.";
  if (!errors.default_memory_limit_mb && !errors.max_memory_limit_mb && n("default_memory_limit_mb") > n("max_memory_limit_mb"))
    errors.default_memory_limit_mb = "Không được lớn hơn bộ nhớ tối đa.";
  const weights = GRADE_COMPONENTS.map((c) => draft.weights[c]);
  if (!weights.every(isIntText) || weightSum(draft) !== 100) errors.weights = "Mỗi trọng số là số nguyên 0–100, tổng đúng 100.";
  if (draft.max_absences.trim() !== "" && !isIntText(draft.max_absences)) errors.max_absences = "Nhập số nguyên hoặc để trống.";
  for (const k of PENALTY_KEYS) {
    const v = toNum(draft.penalties[k]);
    if (!(v >= 0 && v <= 10 && Number.isInteger(v * 4))) errors[k] = "Từ 0 đến 10, bước 0,25.";
  }
  if (draft.maintenance.message.length > 500) errors.maintenance = "Tối đa 500 ký tự.";
  return errors;
}

export const weightSum = (draft: SettingsDraft) =>
  GRADE_COMPONENTS.reduce((sum, c) => sum + (isIntText(draft.weights[c]) ? Number(draft.weights[c]) : 0), 0);

/** Trần upload phía server (`MAX_UPLOAD_MB`, mặc định 20) — admin-spec §1; server vẫn kiểm lại. */
export const SERVER_UPLOAD_CAP_MB = 20;
