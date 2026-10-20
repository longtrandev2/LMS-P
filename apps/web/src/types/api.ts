/** Kiểu dùng chung khớp hợp đồng api-spec.md §1–§3 (assumptions ghi ở DESIGN/report) */

export type Role = "admin" | "lecturer" | "student";
export type UserStatus = "active" | "locked";

export interface CurrentUser {
  id: string;
  email: string;
  full_name: string;
  student_code?: string | null;
  roles: Role[];
  status: UserStatus;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  student_code?: string | null;
  roles: Role[];
  status: UserStatus;
  created_at: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  created_at: string;
}

export interface ClassSummary {
  id: string;
  code: string;
  name: string;
  semester: string;
  course_id: string;
  course_code: string;
  course_name: string;
  lecturer_name?: string | null;
}

export interface ClassStudent {
  user_id: string;
  full_name: string;
  email: string;
  student_code?: string | null;
  enrolled_at: string;
}

/** Envelope phân trang chuẩn §1: {items, total, page, limit} */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: CurrentUser;
}

export interface ImportResult {
  created: number;
  skipped: number;
  errors: { row: number; reason: string }[];
}
