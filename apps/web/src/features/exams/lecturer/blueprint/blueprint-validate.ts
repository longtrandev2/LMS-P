import { isExamCategory } from "@/features/exams/shared/exam-labels";
import { isImplicitSection, paperSummaries, parseNumber, variantTotal, type BlueprintForm } from "./blueprint-model";
import type { AssignmentCategory } from "@/types/api";

const MAX_POINTS = 1000;
const MAX_RULE_POINTS = 100;

export interface DeliveryFields { timeLimit: string; paperMode: BlueprintForm["paperMode"]; variantCount: string; rulesText: string }

/** Kiểm tra mục "Thời gian & cách giao đề" — exam-spec.md §2. */
export function validateDelivery(form: DeliveryFields, category: AssignmentCategory): Record<string, string> {
  const errors: Record<string, string> = {};
  const limit = parseNumber(form.timeLimit);
  if (isExamCategory(category) && limit == null) errors.timeLimit = "Kỳ thi cần thời lượng làm bài.";
  else if (form.timeLimit.trim() && (limit == null || !Number.isInteger(limit) || limit < 1 || limit > 600)) {
    errors.timeLimit = "Thời lượng là số phút nguyên từ 1 đến 600.";
  }
  if (form.paperMode === "variants" && variantTotal(form) == null) errors.variantCount = "Số mã đề từ 2 đến 20.";
  if (form.rulesText.length > 10000) errors.rulesText = "Quy chế tối đa 10 000 ký tự.";
  return errors;
}

/** Kiểm tra cấu trúc đề: tên phần, điểm câu, số câu/điểm quy tắc, mã đề, ràng buộc quiz — exam-spec.md §3. */
export function validateBlueprint(form: BlueprintForm, category: AssignmentCategory, publishing: boolean): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!isImplicitSection(form)) {
    form.sections.forEach((section) => {
      if (!section.title.trim()) errors[`section:${section.key}`] = "Nhập tên phần.";
      else if (section.title.trim().length > 200) errors[`section:${section.key}`] = "Tên phần tối đa 200 ký tự.";
    });
  }
  form.questions.forEach((question) => {
    const points = parseNumber(question.points);
    if (points == null || points <= 0) errors[`points:${question.question_id}`] = "Điểm phải lớn hơn 0.";
    else if (points > MAX_POINTS) errors[`points:${question.question_id}`] = `Tối đa ${MAX_POINTS} điểm.`;
  });
  form.rules.forEach((rule) => {
    const count = parseNumber(rule.count);
    const points = parseNumber(rule.points);
    if (count == null || !Number.isInteger(count) || count < 1 || count > 100) errors[`rule:${rule.key}`] = "Số câu là số nguyên từ 1 đến 100.";
    else if (points == null || points <= 0 || points > MAX_RULE_POINTS) errors[`rule:${rule.key}`] = `Điểm mỗi câu từ 0,01 đến ${MAX_RULE_POINTS}.`;
  });

  const structure: string[] = [];
  if (form.sections.length > 20) structure.push("Đề có tối đa 20 phần.");
  if (form.rules.length > 50) structure.push("Đề có tối đa 50 quy tắc bốc ngẫu nhiên.");
  const total = variantTotal(form);
  const scoped = [...form.questions.map((q) => q.variant), ...form.rules.map((r) => r.variant)].filter((v) => v != null);
  if (form.paperMode !== "variants" && scoped.length) structure.push(`${scoped.length} mục đang gắn với mã đề riêng — đưa về "Chung mọi mã đề" hoặc chọn lại chế độ Nhiều mã đề.`);
  else if (total != null && scoped.some((v) => v! > total)) structure.push("Có mục gắn với mã đề vượt quá số mã đề.");
  if (category === "quiz" && (form.questions.some((q) => q.type === "programming") || form.rules.some((r) => r.type === "programming"))) {
    structure.push("Quiz không nhận câu lập trình. Bỏ các câu/quy tắc lập trình hoặc đổi hạng mục.");
  }
  if (publishing) {
    const papers = paperSummaries(form);
    if (form.questions.length === 0 && form.rules.length === 0) structure.push("Thêm ít nhất một câu hoặc quy tắc trước khi xuất bản.");
    else if (papers.some((paper) => paper.points <= 0)) structure.push("Tổng điểm của mỗi đề phải lớn hơn 0.");
    else if (new Set(papers.map((paper) => paper.points)).size > 1) structure.push("Các mã đề phải có cùng tổng điểm.");
  }
  if (structure.length) errors.questions = structure.join(" ");
  return errors;
}
