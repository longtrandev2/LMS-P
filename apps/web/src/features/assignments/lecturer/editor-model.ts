import { localInputToUtcDateTime, utcDateTimeToLocalInput } from "@/lib/date-time";
import type {
  AssignmentCategory, AssignmentDetails, AssignmentInput, QuestionDifficulty, QuestionType, ReviewMode, ScorePolicy,
} from "@/types/api";

/** Câu đã chọn vào đề (điểm giữ dạng chuỗi để người dùng gõ tự do). */
export interface SelectedQuestion {
  question_id: number;
  type: QuestionType;
  content: string;
  difficulty: QuestionDifficulty;
  bank_name?: string;
  points: string;
}

export interface EditorForm {
  title: string;
  description: string;
  category: AssignmentCategory;
  useAvailableFrom: boolean;
  availableFrom: string;
  dueAt: string;
  allowLate: boolean;
  lateDueAt: string;
  latePenalty: string;
  attemptsLimited: boolean;
  maxAttempts: string;
  scorePolicy: ScorePolicy;
  reviewMode: ReviewMode;
  reviewShowsAnswers: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  questions: SelectedQuestion[];
  classIds: number[];
  reason: string;
}

export type FieldErrors = Record<string, string>;
export type EditorMode = "create" | "draft" | "published";

function localIn(days: number, hour = 23, minute = 59): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  const part = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${part(date.getMonth() + 1)}-${part(date.getDate())}T${part(date.getHours())}:${part(date.getMinutes())}`;
}

export function initialForm(details: AssignmentDetails | null, classId: number): EditorForm {
  const a = details?.assignment;
  return {
    title: a?.title ?? "",
    description: a?.description ?? "",
    category: a?.category ?? "assignment",
    useAvailableFrom: !!a?.available_from,
    availableFrom: a?.available_from ? utcDateTimeToLocalInput(a.available_from) : localIn(0, new Date().getHours() + 1, 0),
    dueAt: a ? utcDateTimeToLocalInput(a.due_at) : localIn(7),
    allowLate: a?.allow_late ?? false,
    lateDueAt: a?.late_due_at ? utcDateTimeToLocalInput(a.late_due_at) : localIn(9),
    latePenalty: String(a?.late_penalty_percent ?? 0),
    attemptsLimited: a ? a.max_attempts != null : true,
    maxAttempts: String(a?.max_attempts ?? 1),
    scorePolicy: a?.score_policy ?? "best",
    reviewMode: a?.review_mode ?? "after_close",
    reviewShowsAnswers: a?.review_shows_answers ?? true,
    shuffleQuestions: a?.shuffle_questions ?? false,
    shuffleOptions: a?.shuffle_options ?? false,
    questions: [...(details?.questions ?? [])].sort((x, y) => x.position - y.position).map((q) => ({
      question_id: q.question_id, type: q.type, content: q.content, difficulty: q.difficulty, points: String(q.points),
    })),
    classIds: [classId],
    reason: "",
  };
}

const MAX_POINTS = 1000;

function parseNumber(value: string): number | null {
  if (!value.trim()) return null;
  const number = Number(value.replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

export function pointsOf(question: SelectedQuestion): number {
  return parseNumber(question.points) ?? 0;
}

export function totalPoints(questions: SelectedQuestion[]): number {
  return Math.round(questions.reduce((sum, q) => sum + pointsOf(q), 0) * 100) / 100;
}

/** Chia đều tổng điểm (làm tròn 2 chữ số), phần dư dồn vào câu cuối. */
export function splitEvenly(total: number, count: number): string[] {
  if (count <= 0) return [];
  const cents = Math.round(total * 100);
  const each = Math.floor(cents / count);
  const last = cents - each * (count - 1);
  return Array.from({ length: count }, (_, index) => String((index === count - 1 ? last : each) / 100));
}

export function validate(form: EditorForm, mode: EditorMode, publishing: boolean): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.title.trim()) errors.title = "Nhập tên bài.";
  else if (form.title.trim().length > 200) errors.title = "Tên bài tối đa 200 ký tự.";
  const due = localInputToUtcDateTime(form.dueAt);
  if (!due) errors.dueAt = "Chọn hạn nộp.";
  if (form.useAvailableFrom) {
    const from = localInputToUtcDateTime(form.availableFrom);
    if (!from) errors.availableFrom = "Chọn thời điểm mở bài.";
    else if (due && from >= due) errors.availableFrom = "Thời điểm mở phải trước hạn nộp.";
  }
  if (form.allowLate) {
    const late = localInputToUtcDateTime(form.lateDueAt);
    if (!late) errors.lateDueAt = "Chọn hạn nộp muộn.";
    else if (due && late <= due) errors.lateDueAt = "Hạn nộp muộn phải sau hạn nộp.";
    const penalty = parseNumber(form.latePenalty);
    if (penalty == null || penalty < 0 || penalty > 100) errors.latePenalty = "Mức phạt từ 0 đến 100%.";
  }
  if (mode === "published") {
    if (!form.reason.trim()) errors.reason = "Nhập lý do điều chỉnh để lưu lịch sử.";
    return errors;
  }
  if (form.attemptsLimited) {
    const attempts = parseNumber(form.maxAttempts);
    if (attempts == null || !Number.isInteger(attempts) || attempts < 1 || attempts > 100) errors.maxAttempts = "Số lượt là số nguyên từ 1 đến 100.";
  }
  if (mode === "create" && form.classIds.length === 0) errors.classIds = "Chọn ít nhất một lớp.";
  form.questions.forEach((question) => {
    const points = parseNumber(question.points);
    if (points == null || points <= 0) errors[`points:${question.question_id}`] = "Điểm phải lớn hơn 0.";
    else if (points > MAX_POINTS) errors[`points:${question.question_id}`] = `Tối đa ${MAX_POINTS} điểm.`;
  });
  if (form.category === "quiz" && form.questions.some((q) => q.type === "programming")) {
    errors.questions = "Quiz không nhận câu lập trình. Bỏ các câu lập trình hoặc đổi hạng mục.";
  } else if (publishing && form.questions.length === 0) {
    errors.questions = "Thêm ít nhất một câu hỏi trước khi xuất bản.";
  }
  return errors;
}

export function toAssignmentInput(form: EditorForm): AssignmentInput {
  const limited = form.attemptsLimited;
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    category: form.category,
    available_from: form.useAvailableFrom ? localInputToUtcDateTime(form.availableFrom) : null,
    due_at: localInputToUtcDateTime(form.dueAt) ?? "",
    allow_late: form.allowLate,
    late_due_at: form.allowLate ? localInputToUtcDateTime(form.lateDueAt) : null,
    late_penalty_percent: form.allowLate ? parseNumber(form.latePenalty) ?? 0 : 0,
    max_attempts: limited ? Number(form.maxAttempts) : null,
    score_policy: form.scorePolicy,
    review_mode: form.reviewMode,
    review_shows_answers: form.reviewShowsAnswers,
    shuffle_questions: form.shuffleQuestions,
    shuffle_options: form.shuffleOptions,
    questions: form.questions.map((q, index) => ({ question_id: q.question_id, points: pointsOf(q), position: index + 1 })),
  };
}

/** Body `PATCH /assignments/{id}/published-settings` — không có trường câu hỏi/điểm/trộn. */
export function toPublishedSettings(form: EditorForm) {
  const input = toAssignmentInput(form);
  return {
    title: input.title, description: input.description, available_from: input.available_from, due_at: input.due_at,
    allow_late: input.allow_late, late_due_at: input.late_due_at, late_penalty_percent: input.late_penalty_percent,
    review_mode: input.review_mode, review_shows_answers: input.review_shows_answers, reason: form.reason.trim(),
  };
}
