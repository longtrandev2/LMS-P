import { PARTIAL_SCORING_TYPES } from "@/lib/question-types";
import type { AnswerSpec, QuestionInput, QuestionProgramming } from "@/types/api";
import { blankCount, parseDecimal, type QuestionDraft } from "./question-draft";

const trimList = (values: string[]) => values.map((value) => value.trim()).filter(Boolean);

function answerSpec(draft: QuestionDraft): AnswerSpec | null {
  switch (draft.type) {
    case "short_answer":
      return { accepted: trimList(draft.accepted), case_sensitive: draft.case_sensitive };
    case "numeric":
      return { value: parseDecimal(draft.numeric.value) ?? 0, tolerance: parseDecimal(draft.numeric.tolerance) ?? 0 };
    case "fill_blank":
      return { blanks: draft.blanks.slice(0, blankCount(draft.content)).map((blank) => ({ accepted: trimList(blank.accepted), case_sensitive: blank.case_sensitive })) };
    case "matching":
      return {
        pairs: draft.pairs.map(({ id, right_id, left, right }) => ({ id, right_id, left: left.trim(), right: right.trim() })),
        distractors: draft.distractors.map(({ id, text }) => ({ id, text: text.trim() })),
      };
    case "ordering":
      return { items: draft.items.map(({ id, text }) => ({ id, text: text.trim() })) };
    default:
      return null;
  }
}

function programming(draft: QuestionDraft): QuestionProgramming {
  const p = draft.programming;
  const starters = Object.fromEntries(p.allowed_languages
    .map((lang) => [lang, p.starter_codes[lang] ?? ""] as const)
    .filter(([, code]) => code.trim()));
  const solution = p.solution_code.trim() ? p.solution_code : null;
  return {
    allowed_languages: p.allowed_languages,
    time_limit_ms: Number(p.time_limit_ms),
    memory_limit_mb: p.memory_limit_mb,
    checker_mode: p.checker_mode,
    checker_epsilon: p.checker_mode === "float" ? parseDecimal(p.checker_epsilon) : null,
    starter_codes: starters,
    solution_code: solution,
    solution_language: solution ? p.solution_language : null,
  };
}

/** Chuyển form sang body `POST /questions` / `PATCH /questions/{id}` (một request, gồm cả test). */
export function draftToInput(draft: QuestionDraft, bankId: number): QuestionInput {
  const type = draft.type;
  const usesOptions = type === "mcq" || type === "multiple_choice";
  const input: QuestionInput = {
    bank_id: bankId,
    category_id: draft.category_id,
    type,
    content: draft.content.trim(),
    difficulty: draft.difficulty,
    explanation: draft.explanation.trim() || null,
    scoring_mode: PARTIAL_SCORING_TYPES.includes(type) ? draft.scoring_mode : "all_or_nothing",
    answer_spec: answerSpec(draft),
    programming: type === "programming" ? programming(draft) : null,
  };
  if (usesOptions) input.options = draft.options.map((o) => ({ content: o.content.trim(), is_correct: o.is_correct }));
  if (type === "true_false") input.options = [
    { content: "Đúng", is_correct: draft.true_false === true },
    { content: "Sai", is_correct: draft.true_false === false },
  ];
  if (type === "programming") input.test_cases = draft.tests.map(({ input: stdin, expected_output, is_public }) => ({ input: stdin, expected_output, is_public }));
  return input;
}

/** Chuỗi so sánh để phát hiện thay đổi chưa lưu. */
export function draftSignature(draft: QuestionDraft): string {
  return JSON.stringify(draftToInput(draft, 0));
}
