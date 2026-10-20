/** Kiểu dùng chung khớp apps/api (modules/identity + academics schemas) */

export type Role = "admin" | "lecturer" | "student";
export type UserStatus = "active" | "locked";

/** BE dùng BIGINT — id là number trên JSON */
export interface CurrentUser {
  id: number;
  email: string;
  full_name: string;
  student_code?: string | null;
  roles: Role[];
  status: UserStatus;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  student_code?: string | null;
  roles: Role[];
  status: UserStatus;
  last_login_at?: string | null;
  created_at: string;
}

/** POST /users trả kèm mật khẩu tạm (khi không nhập mật khẩu) */
export interface UserWithTempPassword {
  user: User;
  temporary_password?: string | null;
}

export interface Course {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  created_by: number;
  created_at: string;
}

export interface ClassSummary {
  id: number;
  course_id: number;
  code: string;
  name: string;
  semester: string;
  lecturer_id: number;
  lecturer_name: string;
  course_code: string;
  course_name: string;
}

export interface ClassStudent {
  user_id: number;
  email: string;
  full_name: string;
  student_code?: string | null;
  status: string;
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
  token_type?: string;
  user: CurrentUser;
}

export interface ImportResult {
  created: number;
  /** Email bị bỏ qua (đã tồn tại) */
  skipped: string[];
  errors: { row: number; reason: string }[];
  /** Mật khẩu tạm của các tài khoản vừa tạo — v1 không có email, admin tự giao */
  temp_passwords: { email: string; temp_password: string }[];
}
