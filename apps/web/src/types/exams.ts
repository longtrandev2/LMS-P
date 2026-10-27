/** Kỳ thi, cấu trúc đề, phiên làm bài — docs/exam-spec.md, docs/api-spec.md §7. */
import type { Answer, AnswerResponse, AssignmentCategory, AssignmentQuestion, GradingVerdict, QuizAttempt, SubmissionStatus } from "./assignments";
import type { QuestionDifficulty, QuestionType } from "./questions";

export type PaperMode = "same" | "variants" | "per_student";
export type Delivery = "session" | "standard";
export type AttemptSessionStatus = "in_progress" | "submitted";
export type SubmitReason = "manual" | "timeout" | "forced";
export type ClientSessionEvent = "heartbeat" | "focus_lost" | "focus_back" | "offline" | "online";
export type SessionEventType = ClientSessionEvent | "started" | "resumed" | "submitted" | "auto_submitted" | "forced_submitted" | "extended";

/** Trường thêm vào `AssignmentSummary`. */
export interface DeliverySettings {
  time_limit_minutes?: number | null;
  paper_mode?: PaperMode;
  variant_count?: number | null;
  rules_text?: string | null;
  delivery?: Delivery;
}

export interface SectionInput { title: string }
/** Câu cố định; `section_index`/`variant_no` vắng = phần đầu / mọi mã đề. */
export interface FixedQuestionInput {
  question_id: number;
  points: number;
  position: number;
  section_index?: number | null;
  variant_no?: number | null;
}
export interface DrawRuleInput {
  section_index?: number | null;
  variant_no?: number | null;
  bank_id: number;
  category_id?: number | null;
  difficulty?: QuestionDifficulty | null;
  type?: QuestionType | null;
  count: number;
  points: number;
}
/** Trường thêm vào body tạo/sửa bài. */
export interface BlueprintInput {
  time_limit_minutes?: number | null;
  paper_mode?: PaperMode;
  variant_count?: number | null;
  rules_text?: string | null;
  sections?: SectionInput[];
  draw_rules?: DrawRuleInput[];
}

export interface SectionView { id: number; position: number; title: string }
export interface DrawRuleView extends DrawRuleInput { id: number; pool_size: number }
export interface PlacementView { question_id: number; section_index: number | null; variant_no: number | null }
/** Chỉ giảng viên nhận nội dung; sinh viên nhận mảng rỗng. */
export interface BlueprintView {
  sections?: SectionView[];
  draw_rules?: DrawRuleView[];
  placements?: PlacementView[];
}

export interface PreviewQuestion {
  question_id: number;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  content: string;
  points: number;
  rule_id: number | null;
}
export interface PreviewPaper {
  code: string | null;
  total_points: number;
  question_count: number;
  sections: { title: string; questions: PreviewQuestion[] }[];
}
export interface PapersPreview {
  paper_mode: PaperMode;
  seeded: boolean;
  papers: PreviewPaper[];
  rules: { rule_id: number; requested: number; pool_size: number }[];
  variant_totals: Record<string, number>;
  warnings: string[];
}

export interface SessionClock {
  saved_at?: string;
  server_now: string;
  ends_at: string;
  remaining_seconds: number;
  focus_lost_count?: number;
}
export interface AttemptSessionSummary {
  id: number;
  assignment_id: number;
  attempt_no: number;
  status: AttemptSessionStatus;
  paper_code: string | null;
  started_at: string;
  ends_at: string;
  server_now: string;
  remaining_seconds: number;
  submitted_at: string | null;
  submit_reason: SubmitReason | null;
  focus_lost_count: number;
  attempt: QuizAttempt | null;
}
export interface SavedAnswer {
  question_id: number;
  response: AnswerResponse | null;
  language: string | null;
  source_code: string | null;
  updated_at: string;
}
export interface AttemptSessionView {
  session: AttemptSessionSummary;
  title: string;
  category: AssignmentCategory;
  time_limit_minutes: number | null;
  rules_text: string | null;
  total_points: number;
  sections: { title: string; questions: AssignmentQuestion[] }[];
  answers: SavedAnswer[];
}
/** Một câu gửi khi tự lưu/nộp: `answer` (câu khách quan) hoặc `code`; không có cả hai = xóa. */
export interface SessionAnswerInput {
  question_id: number;
  answer?: Answer | null;
  code?: { language: string; source_code: string } | null;
}

export type MonitorStatus = "not_started" | "in_progress" | "submitted";
export interface MonitorRow {
  student_id: number;
  student_full_name: string;
  student_code: string | null;
  session_id: number | null;
  status: MonitorStatus;
  attempt_no: number | null;
  paper_code: string | null;
  started_at: string | null;
  ends_at: string | null;
  remaining_seconds: number | null;
  answered_count: number;
  question_count: number;
  focus_lost_count: number;
  last_seen_at: string | null;
  online: boolean;
  submit_reason: SubmitReason | null;
  score: number | null;
  max_score: number | null;
  grading_pending: boolean;
}
export interface MonitorTable {
  server_now: string;
  summary: { total: number; not_started: number; in_progress: number; submitted: number; offline: number };
  items: MonitorRow[];
}
export interface SessionEventView { type: SessionEventType; occurred_at: string; detail: Record<string, unknown> | null }

/** Trường thêm vào `QuizAttempt` của lượt giao theo phiên. */
export interface SessionAttemptFields {
  session_id?: number | null;
  paper_code?: string | null;
  submit_reason?: SubmitReason | null;
}
/** Trường thêm vào `ReviewQuestion` cho câu lập trình. */
export interface ReviewCodeFields {
  submission_id?: number | null;
  verdict?: GradingVerdict | null;
  status?: SubmissionStatus | null;
}
