/** Kiểu dùng chung khớp apps/api (modules/identity + academics schemas) */

export type Role = "admin" | "lecturer" | "student";
export type UserStatus = "active" | "locked";

/** BE dùng BIGINT — id là number trên JSON */
export interface CurrentUser {
  id: number;
  email: string;
  full_name: string;
  student_code?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  roles: Role[];
  status: UserStatus;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  student_code?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
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

export type QuestionType = "mcq" | "programming";
export type QuestionDifficulty = "easy" | "medium" | "hard";
export interface QuestionOption {
  id?: number;
  content: string;
  is_correct: boolean;
  position: number;
}
export interface QuestionProgramming {
  starter_code?: string | null;
  solution_code?: string | null;
  allowed_languages?: string[] | null;
  time_limit_ms: number;
  memory_limit_mb: number;
}
export interface QuestionTestCase {
  input: string;
  expected_output: string;
  is_public: boolean;
  weight: number;
  position: number;
}
export interface QuestionSummary {
  id: number;
  owner_id: number;
  bank_id: number;
  course_id?: number | null;
  category_id: number;
  bank_name: string;
  category_name: string;
  type: QuestionType;
  content: string;
  topic?: string | null;
  difficulty: QuestionDifficulty;
  version_no: number;
  updated_at: string;
}
export interface Question extends QuestionSummary {
  options: QuestionOption[];
  programming?: QuestionProgramming | null;
  test_cases: QuestionTestCase[];
  created_at: string;
}
export interface QuestionBank {
  id: number;
  course_id?: number | null;
  course_name?: string | null;
  owner_id: number;
  name: string;
  description?: string | null;
  created_at: string;
}
export interface QuestionCategory { id: number; bank_id: number; name: string }
export interface QuestionCsvRow {
  row: number; content: string; difficulty?: string; topic?: string;
  options: string[]; correct_option: string;
}
export interface QuestionCsvPreview {
  valid_rows: number;
  rows: { row: number; content: string; valid: boolean; code?: string | null; reason?: string | null }[];
}
export interface QuestionImportResult {
  created: number;
  errors: { row: number; code: string; reason: string }[];
}
export type AssignmentCategory = "quiz" | "assignment" | "midterm" | "final";
export type ScorePolicy = "best" | "last";
export interface AssignmentSummary {
  id: number;
  class_id: number;
  title: string;
  description?: string | null;
  category: AssignmentCategory;
  available_from?: string | null;
  due_at: string;
  allow_late: boolean;
  late_due_at?: string | null;
  late_penalty_percent: number;
  max_attempts?: number | null;
  score_policy: ScorePolicy;
  is_published: boolean;
  question_count: number;
  total_points: number;
  created_at: string;
  updated_at: string;
}
export interface AssignmentQuestion {
  question_id: number;
  question_version_id: number;
  type: QuestionType;
  content: string;
  topic?: string | null;
  difficulty: QuestionDifficulty;
  points: number;
  position: number;
  options: { id: number; content: string; is_correct?: boolean | null }[];
  starter_code?: string | null;
  allowed_languages?: string[] | null;
  time_limit_ms?: number | null;
  memory_limit_mb?: number | null;
  test_cases: QuestionTestCase[];
}
export interface AssignmentDetails {
  assignment: AssignmentSummary;
  questions: AssignmentQuestion[];
}
export interface QuizQuestionScore {
  question_id: number;
  score: number;
  max_score: number;
  selected_option_ids?: number[] | null;
}
export interface QuizAttempt {
  attempt_id: number;
  attempt_no: number;
  score: number;
  is_late: boolean;
  late_penalty_percent: number;
  submitted_at: string;
  question_scores: QuizQuestionScore[];
}
export interface AssignmentSubmission {
  id: number;
  assignment_id: number;
  student_id: number;
  question_id: number;
  attempt_no: number;
  selected_option_ids?: number[] | null;
  score?: number | null;
  is_late: boolean;
  submitted_at: string;
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
  grade_policy?: unknown;
  max_students?: number | null;
  enroll_from?: string | null;
  enroll_until?: string | null;
  room?: string | null;
  schedule?: string | null;
  status?: "active" | "locked";
  enrolled_count?: number;
  seats_left?: number | null;
}

export interface ClassStudent {
  user_id: number;
  email: string;
  full_name: string;
  student_code?: string | null;
  status: string;
  enrolled_at: string;
}

export interface StudentCandidate {
  user_id: number;
  email: string;
  full_name: string;
  student_code?: string | null;
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

export interface ImportPreview {
  valid_rows: number;
  errors: { row: number; reason: string }[];
  duplicates: { row: number; email?: string | null; student_code?: string | null }[];
}

export interface UserDetail {
  user: User;
  enrolled_classes: { id: number; code: string; name: string; course_name: string; semester: string }[];
  teaching_classes: { id: number; code: string; name: string; course_name: string; semester: string }[];
}
