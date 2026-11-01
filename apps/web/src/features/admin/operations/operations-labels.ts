import type { AnnouncementAudience } from "@/types/admin";

/** Nhãn hàng đợi — admin-spec §3. */
export const QUEUE_LABEL: Record<string, string> = {
  "q.grading.dead": "Job chấm bài",
  "q.grading.events.dead": "Sự kiện kết quả chấm",
  "q.runs.dead": "Job chạy thử",
  "q.run.events.dead": "Sự kiện kết quả chạy thử",
};

export const ROLE_OPTIONS = [
  { value: "student", label: "Sinh viên" },
  { value: "lecturer", label: "Giảng viên" },
  { value: "admin", label: "Quản trị viên" },
] as const;
export type AnnouncementRole = (typeof ROLE_OPTIONS)[number]["value"];

export const AUDIENCE_LABEL: Record<AnnouncementAudience, string> = {
  all: "Tất cả",
  role: "Theo vai trò",
  class: "Theo lớp",
};

/** Mô tả người nhận: "Tất cả người dùng", "Vai trò: Sinh viên", "Lớp: LTM-01". */
export function audienceText(audience: AnnouncementAudience, role?: string | null, classCode?: string | null): string {
  if (audience === "role") return `Vai trò: ${ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role ?? "—"}`;
  if (audience === "class") return `Lớp: ${classCode ?? "—"}`;
  return "Tất cả người dùng";
}
