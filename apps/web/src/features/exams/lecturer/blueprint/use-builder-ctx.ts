import { questionTypeLabel } from "@/lib/question-types";
import { DIFFICULTY_LABEL } from "@/features/assignments/lecturer/labels";
import { orderedBySection, poolSizes, type BlueprintForm, type RuleDraft } from "./blueprint-model";
import type { BuilderCtx } from "./builder-types";
import type { PublishIssue } from "./publish-issue";
import { countMatching, useBanksQuestions, useCategoryNames } from "./use-bank-data";
import type { AssignmentDetails } from "@/types/api";

type Handlers = Pick<BuilderCtx, "openPicker" | "openRule" | "openMatrix" | "preview">;

/** Dựng `BuilderCtx`: tra tên danh mục, kho (server hoặc ước tính), thiếu câu theo lỗi xuất bản. */
export function useBuilderCtx({ form, patch, errors, locked, quiz, scope, details, issue, handlers }: {
  form: BlueprintForm; patch: (next: Partial<BlueprintForm>) => void; errors: Record<string, string>; locked: boolean;
  quiz: boolean; scope: number | null; details: AssignmentDetails | null; issue: PublishIssue | null; handlers: Handlers;
}): BuilderCtx {
  const bankIds = form.rules.map((rule) => rule.bankId);
  const categoryNames = useCategoryNames(bankIds);
  const bankQuestions = useBanksQuestions(locked ? [] : bankIds);
  const exact = poolSizes(form, details);
  const fixedIds = new Set(form.questions.map((q) => q.question_id));
  const ordered = orderedBySection(form, form.rules);

  return {
    form, patch, errors, locked, quiz, scope, variants: form.paperMode === "variants", ...handlers,
    poolOf: (rule: RuleDraft) => {
      const size = exact.get(rule.key);
      if (size != null) return { size, exact: true };
      const questions = bankQuestions.get(rule.bankId);
      return questions ? { size: countMatching(questions, rule, fixedIds, quiz), exact: false } : null;
    },
    ruleCriteria: (rule: RuleDraft) => [
      rule.categoryId != null ? categoryNames.get(rule.categoryId) ?? `Danh mục #${rule.categoryId}` : "Mọi danh mục",
      rule.difficulty ? DIFFICULTY_LABEL[rule.difficulty] : "Mọi độ khó",
      rule.type ? questionTypeLabel(rule.type) : quiz ? "Mọi loại (trừ lập trình)" : "Mọi loại câu",
    ].join(" · "),
    shortageOf: (rule: RuleDraft) => {
      const index = ordered.indexOf(rule);
      const hit = issue?.shortages.find((item) => item.ruleIndex === index);
      return hit ? { requested: hit.requested, available: hit.available } : null;
    },
  };
}
