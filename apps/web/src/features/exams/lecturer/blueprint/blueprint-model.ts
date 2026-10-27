import { roman } from "@/features/exams/shared/exam-labels";
import type { AssignmentDetails, QuestionDifficulty, QuestionType } from "@/types/api";
import type { DrawRuleInput, FixedQuestionInput, PaperMode, SectionInput } from "@/types/exams";

/** Cấu trúc đề phía form — docs/exam-spec.md §3.2, §8.2. Phần có `key` ổn định để sắp xếp/xóa không làm lệch mục. */
export interface SectionDraft { key: string; title: string }

/** Câu cố định trong đề (điểm giữ dạng chuỗi để gõ tự do). `variant` null = mọi mã đề. */
export interface SelectedQuestion {
  question_id: number;
  type: QuestionType;
  content: string;
  difficulty: QuestionDifficulty;
  bank_name?: string;
  points: string;
  sectionKey: string;
  variant: number | null;
}

export interface RuleDraft {
  key: string;
  sectionKey: string;
  variant: number | null;
  bankId: number;
  categoryId: number | null;
  difficulty: QuestionDifficulty | null;
  type: QuestionType | null;
  count: string;
  points: string;
}

export interface BlueprintForm {
  paperMode: PaperMode;
  variantCount: string;
  sections: SectionDraft[];
  questions: SelectedQuestion[];
  rules: RuleDraft[];
}

let seq = 0;
export const newKey = (prefix: string) => `${prefix}${++seq}`;

export function parseNumber(value: string): number | null {
  if (!value.trim()) return null;
  const number = Number(value.replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

export const round2 = (value: number) => Math.round(value * 100) / 100;

export function defaultSectionTitle(index: number): string {
  return `Phần ${roman(index + 1)}`;
}

/** Đọc cấu trúc đề từ chi tiết bài (giảng viên). Bài cũ không có phần → một phần không tên chứa mọi câu. */
export function initBlueprint(details: AssignmentDetails | null): Pick<BlueprintForm, "sections" | "questions" | "rules"> {
  const sections: SectionDraft[] = [...(details?.sections ?? [])].sort((a, b) => a.position - b.position)
    .map((section) => ({ key: newKey("s"), title: section.title }));
  if (sections.length === 0) sections.push({ key: newKey("s"), title: "" });
  const keyAt = (index: number | null | undefined) => sections[Math.min(index ?? 0, sections.length - 1)].key;
  const placements = details?.placements ?? [];
  const rulesView = details?.draw_rules ?? [];
  const placed = new Map(placements.map((p) => [p.question_id, p]));
  const fixed = [...(details?.questions ?? [])]
    .filter((q) => placements.length > 0 ? placed.has(q.question_id) : rulesView.length === 0)
    .sort((x, y) => x.position - y.position);
  return {
    sections,
    questions: fixed.map((q) => ({
      question_id: q.question_id, type: q.type, content: q.content, difficulty: q.difficulty, points: String(q.points),
      sectionKey: keyAt(placed.get(q.question_id)?.section_index), variant: placed.get(q.question_id)?.variant_no ?? null,
    })),
    rules: rulesView.map((rule) => ({
      key: newKey("r"), sectionKey: keyAt(rule.section_index), variant: rule.variant_no ?? null, bankId: rule.bank_id,
      categoryId: rule.category_id ?? null, difficulty: rule.difficulty ?? null, type: rule.type ?? null,
      count: String(rule.count), points: String(rule.points),
    })),
  };
}

/** Một phần duy nhất chưa đặt tên = "phần không tên" (gửi `sections: []`). */
export function isImplicitSection(form: Pick<BlueprintForm, "sections">): boolean {
  return form.sections.length === 1 && !form.sections[0].title.trim();
}

/** Mục theo thứ tự gửi lên API: theo phần, rồi theo thứ tự trong phần. */
export function orderedBySection<T extends { sectionKey: string }>(form: Pick<BlueprintForm, "sections">, items: T[]): T[] {
  return form.sections.flatMap((section) => items.filter((item) => item.sectionKey === section.key));
}

export function sectionIndexOf(form: Pick<BlueprintForm, "sections">, key: string): number {
  return Math.max(0, form.sections.findIndex((section) => section.key === key));
}

export function toBlueprintInput(form: BlueprintForm): { sections: SectionInput[]; questions: FixedQuestionInput[]; draw_rules: DrawRuleInput[] } {
  const implicit = isImplicitSection(form);
  const index = (key: string) => implicit ? null : sectionIndexOf(form, key);
  const variant = (value: number | null) => form.paperMode === "variants" ? value : null;
  return {
    sections: implicit ? [] : form.sections.map((section) => ({ title: section.title.trim() })),
    questions: orderedBySection(form, form.questions).map((q, i) => ({
      question_id: q.question_id, points: parseNumber(q.points) ?? 0, position: i + 1,
      section_index: index(q.sectionKey), variant_no: variant(q.variant),
    })),
    draw_rules: orderedBySection(form, form.rules).map((rule) => ({
      section_index: index(rule.sectionKey), variant_no: variant(rule.variant), bank_id: rule.bankId,
      category_id: rule.categoryId, difficulty: rule.difficulty, type: rule.type,
      count: parseNumber(rule.count) ?? 0, points: parseNumber(rule.points) ?? 0,
    })),
  };
}

/** Số mã đề hợp lệ (2–20) hoặc null. */
export function variantTotal(form: Pick<BlueprintForm, "paperMode" | "variantCount">): number | null {
  if (form.paperMode !== "variants") return null;
  const value = parseNumber(form.variantCount);
  return value != null && Number.isInteger(value) && value >= 2 && value <= 20 ? value : null;
}

export interface PaperSummary { variant: number | null; count: number; points: number }

/** Số câu + tổng điểm từng đề (mỗi mã đề, hoặc một đề). */
export function paperSummaries(form: BlueprintForm): PaperSummary[] {
  const total = variantTotal(form);
  const variants: (number | null)[] = total ? Array.from({ length: total }, (_, i) => i + 1) : [null];
  return variants.map((variant) => {
    const inPaper = (value: number | null) => form.paperMode !== "variants" || value == null || value === variant;
    let count = 0;
    let points = 0;
    form.questions.filter((q) => inPaper(q.variant)).forEach((q) => { count += 1; points += parseNumber(q.points) ?? 0; });
    form.rules.filter((r) => inPaper(r.variant)).forEach((r) => {
      const n = parseNumber(r.count) ?? 0;
      count += n;
      points += n * (parseNumber(r.points) ?? 0);
    });
    return { variant, count, points: round2(points) };
  });
}

/** Chữ ký quy tắc để khớp với `draw_rules` của server (lấy `pool_size`). */
function signature(section: number, rule: { variant: number | null; bankId: number; categoryId: number | null; difficulty: string | null; type: string | null }) {
  return [section, rule.variant ?? "", rule.bankId, rule.categoryId ?? "", rule.difficulty ?? "", rule.type ?? ""].join("|");
}

/** Kích thước kho hiện tại theo quy tắc (từ lần lưu gần nhất); quy tắc đã sửa/chưa lưu → không có. */
export function poolSizes(form: BlueprintForm, details: AssignmentDetails | null): Map<string, number> {
  const known = new Map<string, number>();
  (details?.draw_rules ?? []).forEach((rule) => known.set(signature(rule.section_index ?? 0, {
    variant: rule.variant_no ?? null, bankId: rule.bank_id, categoryId: rule.category_id ?? null,
    difficulty: rule.difficulty ?? null, type: rule.type ?? null,
  }), rule.pool_size));
  const result = new Map<string, number>();
  form.rules.forEach((rule) => {
    const size = known.get(signature(sectionIndexOf(form, rule.sectionKey), rule));
    if (size != null) result.set(rule.key, size);
  });
  return result;
}
