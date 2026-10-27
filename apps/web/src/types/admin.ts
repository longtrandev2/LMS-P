/** Quản trị, vận hành — docs/admin-spec.md, docs/api-spec.md §9. */

export type SettingKey =
  | "allowed_languages" | "default_time_limit_ms" | "default_memory_limit_mb" | "max_time_limit_ms"
  | "max_memory_limit_mb" | "practice_runs_per_minute" | "max_upload_mb" | "leave_evidence_max_mb"
  | "default_grade_policy" | "maintenance";

export interface UserRef { id: number; full_name: string }
export interface SettingView {
  key: SettingKey;
  value: unknown;
  default_value: unknown;
  description: string;
  updated_by: UserRef | null;
  updated_at: string | null;
}
export interface MaintenanceSetting { enabled: boolean; message?: string | null }
export interface PublicSettings {
  allowed_languages: string[];
  default_time_limit_ms: number;
  default_memory_limit_mb: number;
  max_time_limit_ms: number;
  max_memory_limit_mb: number;
  max_upload_mb: number;
  leave_evidence_max_mb: number;
  maintenance: MaintenanceSetting;
}

export interface DailyStat {
  date: string;
  submissions_objective: number;
  submissions_code: number;
  new_users: number;
  grading_avg_ms: number | null;
  grading_p95_ms: number | null;
}
export interface StatsView {
  generated_at: string;
  days: number;
  totals: {
    users: { student: number; lecturer: number; admin: number; locked: number };
    active_classes: number;
    submissions_today: number;
    sessions_in_progress: number;
  };
  daily: DailyStat[];
  /** Verdict chấm code + khóa `failed`. */
  verdicts: Record<string, number>;
  top_classes: { class_id: number; code: string; name: string; submissions: number }[];
}

export interface QueueStat { name: string; messages: number; consumers: number }
export interface QueueHealth { queues: QueueStat[]; checked_at: string }
export interface RealtimeView {
  ws_connections: number;
  ws_users: number;
  online_users: { student: number; lecturer: number; admin: number; total: number };
  workers: number;
  checked_at: string;
}

export interface FailedSubmission {
  submission_id: number;
  assignment_id: number;
  assignment_title: string;
  class_code: string;
  student_full_name: string;
  student_code: string | null;
  language: string | null;
  submitted_at: string;
  error_message: string | null;
  grading_attempts: number;
}
export interface Page<T> { items: T[]; total: number; page: number; limit: number }

export type AnnouncementAudience = "all" | "role" | "class";
export interface AnnouncementInput {
  title: string;
  body: string;
  audience: AnnouncementAudience;
  role?: "student" | "lecturer" | "admin" | null;
  class_id?: number | null;
}
export interface AnnouncementView {
  id: number;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  role: string | null;
  class_id: number | null;
  class_code: string | null;
  recipient_count: number;
  created_by: UserRef;
  created_at: string;
}

export interface LoginSessionView {
  family: string;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
  last_used_at: string | null;
  expires_at: string;
}
