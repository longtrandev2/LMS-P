// Hợp đồng câu hỏi — docs/assessment-spec.md §1–4, docs/api-spec.md §5.
export type QuestionType =
  | "mcq" | "multiple_choice" | "true_false" | "short_answer" | "numeric"
  | "fill_blank" | "matching" | "ordering" | "programming";
export type QuestionDifficulty = "easy" | "medium" | "hard";
export type ScoringMode = "all_or_nothing" | "partial";
export type ProgrammingLanguage = "python" | "c" | "cpp" | "java";
export type CheckerMode = "token" | "line" | "float";

export interface QuestionOption {
  id?: number;
  content: string;
  is_correct: boolean;
  position: number;
}
export interface BlankSpec { accepted: string[]; case_sensitive?: boolean | null }
export interface PairSpec { id?: string; left: string; right: string; right_id?: string }
export interface ChoiceItem { id?: string; text: string }
/** Chỉ trường đúng loại câu có giá trị (§1.2). */
export interface AnswerSpec {
  accepted?: string[];
  case_sensitive?: boolean | null;
  value?: number;
  tolerance?: number;
  blanks?: BlankSpec[];
  pairs?: PairSpec[];
  distractors?: ChoiceItem[];
  items?: ChoiceItem[];
}
export interface QuestionProgramming {
  /** Trường cũ — chỉ đọc. Dùng `starter_codes`. */
  starter_code?: string | null;
  starter_codes?: Partial<Record<ProgrammingLanguage, string>> | null;
  solution_code?: string | null;
  solution_language?: ProgrammingLanguage | null;
  allowed_languages?: ProgrammingLanguage[] | null;
  time_limit_ms: number;
  memory_limit_mb: number;
  checker_mode?: CheckerMode | null;
  checker_epsilon?: number | null;
}
export interface QuestionTestCase {
  input: string;
  expected_output: string;
  is_public: boolean;
  /** Không dùng (chấm nhị phân) — API bỏ qua. */
  weight?: number;
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
  explanation?: string | null;
  scoring_mode?: ScoringMode | null;
  options: QuestionOption[];
  answer_spec?: AnswerSpec | null;
  programming?: QuestionProgramming | null;
  test_cases: QuestionTestCase[];
  created_at: string;
}
/** Body POST /questions và PATCH /questions/{id} — một request lưu cả câu và test. */
export interface QuestionInput {
  bank_id?: number;
  category_id?: number | null;
  type: QuestionType;
  content: string;
  difficulty: QuestionDifficulty;
  explanation?: string | null;
  scoring_mode?: ScoringMode;
  options?: { content: string; is_correct: boolean }[];
  answer_spec?: AnswerSpec | null;
  programming?: QuestionProgramming | null;
  test_cases?: { input: string; expected_output: string; is_public: boolean }[];
}
export interface DrawRule {
  bank_id: number;
  category_id?: number | null;
  difficulty?: QuestionDifficulty | null;
  type?: QuestionType | null;
  count: number;
}
export interface DrawResult {
  items: QuestionSummary[];
  shortages: { rule: number; requested: number; available: number }[];
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
  /** Số câu chưa xóa trong ngân hàng. */
  question_count?: number;
}
export interface QuestionBankPermission { lecturer_id: number; permission: "view" | "edit" }
export interface QuestionCategory { id: number; bank_id: number; name: string }
export interface QuestionCsvRow {
  row: number;
  type?: "mcq" | "multiple_choice" | "true_false" | "short_answer";
  content: string;
  difficulty?: string;
  /** Không còn dùng trên UI. */
  topic?: string;
  options: string[];
  correct_option: string;
  explanation?: string;
}
export interface QuestionCsvPreview {
  valid_rows: number;
  rows: { row: number; content: string; valid: boolean; code?: string | null; reason?: string | null }[];
}
export interface QuestionImportResult {
  created: number;
  errors: { row: number; code: string; reason: string }[];
}
