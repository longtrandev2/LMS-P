// Chuyển đổi giữa state UI và `Answer`/`AnswerResponse` — docs/assessment-spec.md §3.2.
import type { Answer, AnswerResponse, AssignmentQuestion } from "@/types/api";

/** State UI của một câu trả lời. `number_text` giữ nguyên chuỗi người dùng gõ (nhận dấu phẩy). */
export interface DraftAnswer {
  selected?: number[];
  text?: string;
  number_text?: string;
  blanks?: string[];
  matches?: Record<string, string>;
  order?: string[];
}

export type AnswerProgress = "empty" | "partial" | "complete";

const BLANK_PATTERN = /\[\[(\d+)\]\]/g;

/** Số ô trống của câu `fill_blank` (ưu tiên `blank_count` của API). */
export function blankCount(question: AssignmentQuestion): number {
  if (question.blank_count) return question.blank_count;
  const found = question.content.match(BLANK_PATTERN);
  return found ? new Set(found).size : 0;
}

/** Thay `[[n]]` bằng nhãn "(n)" để hiển thị nội dung câu điền chỗ trống. */
export function renderBlankLabels(content: string): string {
  return content.replace(BLANK_PATTERN, (_, n: string) => `**(${n})**`);
}

/** Đọc số kiểu Việt Nam/quốc tế: "3,5" hoặc "3.5", cho phép dấu và số mũ. */
export function parseNumberText(text: string): number | null {
  const normalized = text.trim().replace(/\s+/g, "").replace(",", ".");
  if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/** Thứ tự hiện tại của câu `ordering`: nháp hợp lệ (đủ hoán vị) hoặc thứ tự đề đã trộn. */
export function currentOrder(question: AssignmentQuestion, draft: DraftAnswer): string[] {
  const ids = (question.ordering_items ?? []).map((item) => item.id);
  const order = draft.order;
  const valid = order && order.length === ids.length && ids.every((id) => order.includes(id));
  return valid ? order : ids;
}

/** Câu trả lời gửi API, `null` khi bỏ trống. Chỉ gồm trường đúng loại câu. */
export function toResponse(question: AssignmentQuestion, draft: DraftAnswer | undefined): AnswerResponse | null {
  if (!draft) return null;
  switch (question.type) {
    case "mcq":
    case "multiple_choice":
    case "true_false":
      return draft.selected?.length ? { selected_option_ids: draft.selected } : null;
    case "short_answer":
      return draft.text?.trim() ? { text: draft.text.trim() } : null;
    case "numeric": {
      const value = parseNumberText(draft.number_text ?? "");
      return value == null ? null : { number: value };
    }
    case "fill_blank": {
      const blanks = Array.from({ length: blankCount(question) }, (_, index) => draft.blanks?.[index]?.trim() ?? "");
      return blanks.some(Boolean) ? { blanks } : null;
    }
    case "matching": {
      const entries = Object.entries(draft.matches ?? {}).filter(([, right]) => Boolean(right));
      return entries.length ? { matches: Object.fromEntries(entries) } : null;
    }
    case "ordering":
      return draft.order ? { order: currentOrder(question, draft) } : null;
    default:
      return null;
  }
}

export function toAnswer(question: AssignmentQuestion, draft: DraftAnswer | undefined): Answer | null {
  const response = toResponse(question, draft);
  return response ? { question_id: question.question_id, ...response } : null;
}

/** State UI từ câu trả lời đã lưu (màn xem lại). */
export function fromResponse(response: AnswerResponse | null | undefined): DraftAnswer {
  if (!response) return {};
  return {
    selected: response.selected_option_ids ?? undefined,
    text: response.text ?? undefined,
    number_text: response.number != null ? String(response.number) : undefined,
    blanks: response.blanks ?? undefined,
    matches: response.matches ?? undefined,
    order: response.order ?? undefined,
  };
}

export function answerProgress(question: AssignmentQuestion, draft: DraftAnswer | undefined): AnswerProgress {
  const response = toResponse(question, draft);
  if (!response) return "empty";
  if (response.blanks) return response.blanks.every(Boolean) ? "complete" : "partial";
  if (response.matches) {
    const total = question.matching?.lefts.length ?? 0;
    return Object.keys(response.matches).length >= total ? "complete" : "partial";
  }
  return "complete";
}

export function isAnswered(question: AssignmentQuestion, draft: DraftAnswer | undefined): boolean {
  return answerProgress(question, draft) !== "empty";
}

/** Chuẩn hóa chuỗi như server (§3.1) — dùng để đánh dấu đúng/sai từng ô trên màn xem lại. */
export function normalizeText(value: string, caseSensitive = false): string {
  const collapsed = value.normalize("NFC").trim().replace(/\s+/g, " ");
  return caseSensitive ? collapsed : collapsed.toLowerCase();
}

export function matchesAccepted(value: string | undefined, accepted: string[] | undefined): boolean {
  if (!value?.trim() || !accepted?.length) return false;
  const normalized = normalizeText(value);
  return accepted.some((item) => normalizeText(item) === normalized);
}
