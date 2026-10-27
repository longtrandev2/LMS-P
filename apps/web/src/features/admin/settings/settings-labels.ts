import { GRADE_COMPONENTS, GRADE_COMPONENT_LABEL } from "@/lib/grades";
import { LANGUAGES } from "@/lib/languages";
import type { GradePolicy } from "@/types/api";
import type { MaintenanceSetting, SettingKey } from "@/types/admin";
import { type IntKey, SERVER_UPLOAD_CAP_MB } from "./settings-model";

/** Nhãn tiếng Việt cho từng khóa cấu hình — docs/admin-spec.md §1. */
export const SETTING_LABEL: Record<SettingKey, string> = {
  allowed_languages: "Ngôn ngữ được phép",
  default_time_limit_ms: "Thời gian mặc định",
  default_memory_limit_mb: "Bộ nhớ mặc định",
  max_time_limit_ms: "Thời gian tối đa",
  max_memory_limit_mb: "Bộ nhớ tối đa",
  practice_runs_per_minute: "Chạy thử mỗi phút",
  max_upload_mb: "Dung lượng học liệu",
  leave_evidence_max_mb: "Dung lượng minh chứng",
  default_grade_policy: "Chính sách điểm mặc định",
  maintenance: "Chế độ bảo trì",
};

export const INT_UNIT: Record<IntKey, string> = {
  default_time_limit_ms: "ms", default_memory_limit_mb: "MB", max_time_limit_ms: "ms", max_memory_limit_mb: "MB",
  practice_runs_per_minute: "lần", max_upload_mb: "MB", leave_evidence_max_mb: "MB",
};

/** Khoảng hợp lệ hiển thị dưới ô (server kiểm chính thức). */
export function rangeHint(key: IntKey, maxTime: string, maxMem: string): string {
  const cap = (s: string) => (/^\d+$/.test(s) ? Number(s).toLocaleString("vi-VN") : "tối đa");
  switch (key) {
    case "default_time_limit_ms": return `100 – ${cap(maxTime)} ms`;
    case "default_memory_limit_mb": return `32 – ${cap(maxMem)} MB`;
    case "max_time_limit_ms": return "1.000 – 20.000 ms";
    case "max_memory_limit_mb": return "64 – 2.048 MB";
    case "practice_runs_per_minute": return "1 – 60 lần mỗi sinh viên";
    case "max_upload_mb": return `1 – ${SERVER_UPLOAD_CAP_MB} MB (trần server)`;
    case "leave_evidence_max_mb": return `1 – ${SERVER_UPLOAD_CAP_MB} MB (trần server)`;
  }
}

const num = (n: unknown) => (typeof n === "number" ? n.toLocaleString("vi-VN") : String(n ?? "—"));

/** Hiển thị gọn một giá trị cấu hình (dùng cho "Mặc định: …" và bảng thay đổi). */
export function formatSetting(key: SettingKey, value: unknown): string {
  if (key === "allowed_languages") {
    const ids = Array.isArray(value) ? (value as string[]) : [];
    return ids.length ? LANGUAGES.filter((l) => ids.includes(l.id)).map((l) => l.short).join(", ") : "—";
  }
  if (key === "maintenance") {
    const m = (value ?? {}) as MaintenanceSetting;
    return m.enabled ? `Bật${m.message?.trim() ? ` — “${m.message.trim()}”` : ""}` : "Tắt";
  }
  if (key === "default_grade_policy") {
    const p = value as GradePolicy | undefined;
    if (!p?.weights) return "—";
    const weights = GRADE_COMPONENTS.map((c) => num(p.weights[c])).join("/");
    const a = p.attendance;
    return `${weights}; nghỉ tối đa ${a.max_absences == null ? "20% số buổi" : num(a.max_absences)}; trừ ${num(a.absent_penalty)} / ${num(a.late_penalty)} / ${num(a.excused_penalty)}`;
  }
  const unit = INT_UNIT[key as IntKey];
  return `${num(value)}${unit ? ` ${unit}` : ""}`;
}

export const WEIGHT_LABEL = GRADE_COMPONENT_LABEL;
export const PENALTY_LABEL = {
  absent_penalty: "Trừ mỗi buổi vắng",
  late_penalty: "Trừ mỗi buổi muộn",
  excused_penalty: "Trừ mỗi buổi có phép",
} as const;
