import type { QuestionType, QuestionDifficulty, QuestionTestCase } from "./questions";

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
  status: "pending" | "grading" | "completed" | "failed";
  type: "mcq" | "code";
  language?: string | null;
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

