// Hợp đồng bài tập/quiz/bài nộp — docs/assessment-spec.md §3, §5–6, docs/api-spec.md §6.
import type {
  AnswerSpec, CheckerMode, ProgrammingLanguage, QuestionDifficulty, QuestionTestCase, QuestionType, ScoringMode,
} from "./questions";

export type AssignmentCategory = "quiz" | "assignment" | "midterm" | "final";
export type ScorePolicy = "best" | "last";
export type ReviewMode = "never" | "after_submit" | "after_close";
export type GradingVerdict = "AC" | "WA" | "CE" | "TLE" | "MLE" | "RE" | "OLE" | "OK" | "SYSTEM_ERROR";
export type SubmissionStatus = "pending" | "grading" | "completed" | "failed";

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
  review_mode?: ReviewMode;
  review_shows_answers?: boolean;
  shuffle_questions?: boolean;
  shuffle_options?: boolean;
  is_published: boolean;
  question_count: number;
  total_points: number;
  created_at: string;
  updated_at: string;
}
/** Body tạo/sửa nháp (`POST /classes/{id}/assignments`, `PATCH /assignments/{id}`, `assignment` của bulk). */
export interface AssignmentInput {
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
  review_mode: ReviewMode;
  review_shows_answers: boolean;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  questions: { question_id: number; points: number; position: number }[];
}
export interface ProgrammingSample { position: number; input: string; expected_output: string }
export interface AssignmentProgramming {
  allowed_languages: ProgrammingLanguage[];
  time_limit_ms: number;
  memory_limit_mb: number;
  checker_mode: CheckerMode;
  starter_codes: Partial<Record<ProgrammingLanguage, string>>;
  samples: ProgrammingSample[];
}
/** Một câu trong đề. Sinh viên không bao giờ nhận `is_correct`, `answer_spec`, `explanation`, test ẩn. */
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
  blank_count?: number | null;
  matching?: { lefts: { id: string; text: string }[]; rights: { id: string; text: string }[] } | null;
  ordering_items?: { id: string; text: string }[] | null;
  programming?: AssignmentProgramming | null;
  /** Chỉ giảng viên. */
  explanation?: string | null;
  scoring_mode?: ScoringMode | null;
  answer_spec?: AnswerSpec | null;
  /** Trường cũ — dùng `programming`. */
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
/** Câu trả lời một câu khách quan (§3.2). Chỉ gửi trường đúng loại. */
export interface Answer {
  question_id: number;
  selected_option_ids?: number[];
  text?: string;
  number?: number;
  blanks?: string[];
  matches?: Record<string, string>;
  order?: string[];
}
export type AnswerResponse = Omit<Answer, "question_id">;
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
  max_score?: number;
  is_late: boolean;
  late_penalty_percent: number;
  submitted_at: string;
  review_available?: boolean;
  review_available_at?: string | null;
  /** null khi chưa được xem lại. */
  question_scores: QuizQuestionScore[] | null;
}
export interface CorrectAnswer {
  option_ids?: number[];
  accepted?: string[];
  case_sensitive?: boolean | null;
  blanks_case_sensitive?: boolean[] | null;
  value?: number;
  tolerance?: number;
  blanks?: string[][];
  matches?: Record<string, string>;
  order?: string[];
}
export interface ReviewQuestion {
  question: AssignmentQuestion;
  response?: AnswerResponse | null;
  score: number;
  max_score: number;
  correct_answer?: CorrectAnswer | null;
  explanation?: string | null;
}
export interface AttemptReview {
  attempt: QuizAttempt;
  review_available: boolean;
  shows_answers: boolean;
  questions: ReviewQuestion[];
}
export interface AssignmentSubmission {
  status: SubmissionStatus;
  type: "mcq" | "code";
  language?: string | null;
  id: number;
  assignment_id: number;
  student_id: number;
  student_full_name?: string | null;
  student_code?: string | null;
  question_id: number;
  attempt_no: number;
  selected_option_ids?: number[] | null;
  score?: number | null;
  verdict?: GradingVerdict | null;
  is_late: boolean;
  submitted_at: string;
}
export interface TestResultView {
  position: number;
  is_public: boolean;
  verdict: GradingVerdict;
  time_ms?: number | null;
  memory_kb?: number | null;
  input?: string | null;
  expected_output?: string | null;
  output?: string | null;
}
export interface GradingResultView {
  grading_attempt: number;
  status: string;
  verdict: GradingVerdict | null;
  compile_error: boolean;
  compile_output?: string | null;
  error_message?: string | null;
  graded_at: string;
  duration_ms: number;
  tests_total?: number | null;
  tests_passed?: number | null;
  failed_test?: number | null;
  tests?: TestResultView[];
}
export interface SubmissionDetails extends AssignmentSubmission {
  question_version_id: number;
  max_score?: number;
  source_code?: string | null;
  response?: AnswerResponse | null;
  correct_answer?: CorrectAnswer | null;
  explanation?: string | null;
  review_available?: boolean;
  result?: GradingResultView | null;
  /** Lịch sử chấm, mới nhất trước. */
  results?: GradingResultView[];
}
export interface StudentResultRow {
  student_id: number;
  student_full_name: string;
  student_code?: string | null;
  final_score?: number | null;
  max_score: number;
  attempt_count: number;
  attempts?: { attempt_id: number; attempt_no: number; score: number; is_late: boolean; submitted_at: string }[];
  questions: { question_id: number; final_score?: number | null; attempt_count: number; last_status?: SubmissionStatus | null; last_verdict?: GradingVerdict | null }[];
}
