import { localInputToUtcDateTime, utcDateTimeToLocalInput } from "@/lib/date-time";
import { hasBlueprint, isExamCategory } from "@/features/exams/shared/exam-labels";
import {
  initBlueprint, newKey, parseNumber, round2, toBlueprintInput, type RuleDraft, type SectionDraft, type SelectedQuestion,
} from "@/features/exams/lecturer/blueprint/blueprint-model";
import { validateBlueprint, validateDelivery } from "@/features/exams/lecturer/blueprint/blueprint-validate";
import type { AssignmentCategory, AssignmentDetails, AssignmentInput, ReviewMode, ScorePolicy } from "@/types/api";
import type { PaperMode } from "@/types/exams";

export type { SelectedQuestion } from "@/features/exams/lecturer/blueprint/blueprint-model";

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
  /** Thời gian & cách giao đề — exam-spec.md §2 (không dùng cho bài tập thường). */
  timeLimit: string;
  paperMode: PaperMode;
  variantCount: string;
  rulesText: string;
  /** Cấu trúc đề — exam-spec.md §3. Bài tập thường: một phần không tên, chỉ câu cố định. */
  sections: SectionDraft[];
  questions: SelectedQuestion[];
  rules: RuleDraft[];
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

export function initialForm(details: AssignmentDetails | null, classId: number, category: AssignmentCategory = "assignment"): EditorForm {
  const a = details?.assignment;
  const exam = isExamCategory(a?.category ?? category);
  return {
    title: a?.title ?? "",
    description: a?.description ?? "",
    category: a?.category ?? category,
    useAvailableFrom: a ? !!a.available_from : exam,
    availableFrom: a?.available_from ? utcDateTimeToLocalInput(a.available_from) : localIn(exam ? 7 : 0, exam ? 7 : new Date().getHours() + 1, 0),
    dueAt: a ? utcDateTimeToLocalInput(a.due_at) : exam ? localIn(7, 9, 0) : localIn(7),
    allowLate: a?.allow_late ?? false,
    lateDueAt: a?.late_due_at ? utcDateTimeToLocalInput(a.late_due_at) : localIn(9),
    latePenalty: String(a?.late_penalty_percent ?? 0),
    attemptsLimited: a ? a.max_attempts != null : true,
    maxAttempts: String(a?.max_attempts ?? 1),
    scorePolicy: a?.score_policy ?? "best",
    reviewMode: a?.review_mode ?? "after_close",
    reviewShowsAnswers: a?.review_shows_answers ?? true,
    shuffleQuestions: a?.shuffle_questions ?? exam,
    shuffleOptions: a?.shuffle_options ?? exam,
    timeLimit: a?.time_limit_minutes ? String(a.time_limit_minutes) : exam ? "45" : "",
    paperMode: a?.paper_mode ?? "same",
    variantCount: String(a?.variant_count ?? 2),
    rulesText: a?.rules_text ?? "",
    ...initBlueprint(details),
    classIds: [classId],
    reason: "",
  };
}

export function pointsOf(question: SelectedQuestion): number {
  return parseNumber(question.points) ?? 0;
}

export function totalPoints(questions: SelectedQuestion[]): number {
  return round2(questions.reduce((sum, q) => sum + pointsOf(q), 0));
}

/** Chia đều tổng điểm (làm tròn 2 chữ số), phần dư dồn vào câu cuối. */
export function splitEvenly(total: number, count: number): string[] {
  if (count <= 0) return [];
  const cents = Math.round(total * 100);
  const each = Math.floor(cents / count);
  const last = cents - each * (count - 1);
  return Array.from({ length: count }, (_, index) => String((index === count - 1 ? last : each) / 100));
}

/** Gộp mọi phần về một phần không tên và bỏ quy tắc (khi đổi sang bài tập thường). */
export function flattenToLegacy(form: EditorForm): Partial<EditorForm> {
  const key = newKey("s");
  return { sections: [{ key, title: "" }], rules: [], questions: form.questions.map((q) => ({ ...q, sectionKey: key, variant: null })) };
}

export function validate(form: EditorForm, mode: EditorMode, publishing: boolean): FieldErrors {
  const errors: FieldErrors = {};
  const exam = isExamCategory(form.category);
  if (!form.title.trim()) errors.title = "Nhập tên bài.";
  else if (form.title.trim().length > 200) errors.title = "Tên bài tối đa 200 ký tự.";
  const due = localInputToUtcDateTime(form.dueAt);
  if (!due) errors.dueAt = exam ? "Chọn giờ đóng." : "Chọn hạn nộp.";
  if (form.useAvailableFrom) {
    const from = localInputToUtcDateTime(form.availableFrom);
    if (!from) errors.availableFrom = "Chọn thời điểm mở bài.";
    else if (due && from >= due) errors.availableFrom = exam ? "Giờ mở phải trước giờ đóng." : "Thời điểm mở phải trước hạn nộp.";
  }
  if (form.allowLate && !exam) {
    const late = localInputToUtcDateTime(form.lateDueAt);
    if (!late) errors.lateDueAt = "Chọn hạn nộp muộn.";
    else if (due && late <= due) errors.lateDueAt = "Hạn nộp muộn phải sau hạn nộp.";
    const penalty = parseNumber(form.latePenalty);
    if (penalty == null || penalty < 0 || penalty > 100) errors.latePenalty = "Mức phạt từ 0 đến 100%.";
  }
  if (hasBlueprint(form.category)) Object.assign(errors, validateDelivery(form, form.category));
  if (mode === "published") {
    if (!form.reason.trim()) errors.reason = "Nhập lý do điều chỉnh để lưu lịch sử.";
    return errors;
  }
  if (form.attemptsLimited && !exam) {
    const attempts = parseNumber(form.maxAttempts);
    if (attempts == null || !Number.isInteger(attempts) || attempts < 1 || attempts > 100) errors.maxAttempts = "Số lượt là số nguyên từ 1 đến 100.";
  }
  if (mode === "create" && form.classIds.length === 0) errors.classIds = "Chọn ít nhất một lớp.";
  if (hasBlueprint(form.category)) return Object.assign(errors, validateBlueprint(form, form.category, publishing));
  Object.assign(errors, validateBlueprint({ ...form, paperMode: "same" }, form.category, false));
  if (form.rules.length || form.sections.length > 1) {
    errors.questions = "Bài tập thường chỉ có một phần và không dùng quy tắc ngẫu nhiên. Gộp lại hoặc đổi hạng mục.";
  } else if (publishing && form.questions.length === 0) {
    errors.questions = "Thêm ít nhất một câu hỏi trước khi xuất bản.";
  }
  return errors;
}

export function toAssignmentInput(form: EditorForm): AssignmentInput {
  const exam = isExamCategory(form.category);
  const blueprint = hasBlueprint(form.category);
  const allowLate = form.allowLate && !exam;
  const limit = parseNumber(form.timeLimit);
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    category: form.category,
    available_from: form.useAvailableFrom ? localInputToUtcDateTime(form.availableFrom) : null,
    due_at: localInputToUtcDateTime(form.dueAt) ?? "",
    allow_late: allowLate,
    late_due_at: allowLate ? localInputToUtcDateTime(form.lateDueAt) : null,
    late_penalty_percent: allowLate ? parseNumber(form.latePenalty) ?? 0 : 0,
    max_attempts: exam ? 1 : form.attemptsLimited ? Number(form.maxAttempts) : null,
    score_policy: exam ? "last" : form.scorePolicy,
    review_mode: form.reviewMode,
    review_shows_answers: form.reviewShowsAnswers,
    shuffle_questions: form.shuffleQuestions,
    shuffle_options: form.shuffleOptions,
    time_limit_minutes: blueprint && limit != null ? limit : null,
    paper_mode: blueprint ? form.paperMode : "same",
    variant_count: blueprint && form.paperMode === "variants" ? Number(form.variantCount) : null,
    rules_text: blueprint ? form.rulesText.trim() || null : null,
    ...toBlueprintInput(blueprint ? form : { ...form, paperMode: "same", rules: [], sections: form.sections.slice(0, 1).map((s) => ({ ...s, title: "" })) }),
  };
}

/** Body `PATCH /assignments/{id}/published-settings` — không có trường câu hỏi/điểm/trộn/cấu trúc đề. */
export function toPublishedSettings(form: EditorForm) {
  const input = toAssignmentInput(form);
  return {
    title: input.title, description: input.description, available_from: input.available_from, due_at: input.due_at,
    allow_late: input.allow_late, late_due_at: input.late_due_at, late_penalty_percent: input.late_penalty_percent,
    review_mode: input.review_mode, review_shows_answers: input.review_shows_answers, reason: form.reason.trim(),
    ...(hasBlueprint(form.category) ? { rules_text: input.rules_text } : {}),
  };
}
