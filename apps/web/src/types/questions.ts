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
  visibility: "private" | "shared";
  can_edit: boolean;
  can_manage: boolean;
  created_at: string;
}
export interface QuestionBankPermission { lecturer_id: number; permission: "view" | "edit" }
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
