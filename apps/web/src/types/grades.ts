// Hợp đồng sổ điểm 4 thành phần — docs/class-schedule-grades-spec.md §5, docs/api-spec.md §8.
import type { AttendanceSummary } from "./schedule";

export type GradeComponent = "attendance" | "assignment" | "midterm" | "final";

export interface GradePolicy {
  /** Phần trăm, tổng = 100. */
  weights: Record<GradeComponent, number>;
  attendance: {
    /** `null` = mặc định 20% số buổi không hủy. */
    max_absences: number | null;
    absent_penalty: number;
    late_penalty: number;
    excused_penalty: number;
  };
}
export interface ComponentGrade {
  /** Điểm hiệu lực (ghi đè/nhập nếu có, ngược lại điểm hệ thống). */
  score: number | null;
  system_score: number | null;
  override: { score: number; reason?: string | null; source?: "manual" | "csv" | "exam"; updated_at: string } | null;
  status: "final" | "provisional" | "missing";
}
export interface GradeRow {
  student_id: number;
  student_code?: string | null;
  full_name: string;
  components: Record<GradeComponent, ComponentGrade>;
  attendance: AttendanceSummary & { max_absences: number };
  eligible: boolean;
  total10: number | null;
  total4: number | null;
  letter: string | null;
  passed: boolean | null;
  status: "final" | "provisional";
}
export interface Gradebook {
  policy: GradePolicy;
  items: GradeRow[];
}
export interface GradeImportRow { row: number; student_code: string; midterm?: number | null; final?: number | null }
export interface GradeImportPreview {
  valid_rows: number;
  rows: { row: number; student_code: string; full_name?: string | null; valid: boolean; reason?: string | null }[];
}
