import { ALL_LANGUAGES } from "@/lib/languages";
import { PARTIAL_SCORING_TYPES } from "@/lib/question-types";
import type { CheckerMode, ProgrammingLanguage, Question, QuestionDifficulty, QuestionType, ScoringMode } from "@/types/api";

/** Trạng thái form soạn câu hỏi — mọi danh sách có `key` cục bộ để React giữ ổn định khi thêm/xóa/đổi chỗ. */
export interface OptionDraft { key: string; content: string; is_correct: boolean }
export interface ItemDraft { key: string; id?: string; text: string }
export interface PairDraft { key: string; id?: string; right_id?: string; left: string; right: string }
export interface BlankDraft { key: string; accepted: string[]; case_sensitive: boolean }
export interface TestDraft { key: string; input: string; expected_output: string; is_public: boolean }
export interface ProgrammingDraft {
  allowed_languages: ProgrammingLanguage[];
  time_limit_ms: string;
  memory_limit_mb: number;
  checker_mode: CheckerMode;
  checker_epsilon: string;
  starter_codes: Partial<Record<ProgrammingLanguage, string>>;
  solution_code: string;
  solution_language: ProgrammingLanguage | null;
}
export interface QuestionDraft {
  type: QuestionType;
  category_id: number | null;
  difficulty: QuestionDifficulty;
  content: string;
  explanation: string;
  scoring_mode: ScoringMode;
  options: OptionDraft[];
  true_false: boolean | null;
  accepted: string[];
  case_sensitive: boolean;
  numeric: { value: string; tolerance: string };
  blanks: BlankDraft[];
  pairs: PairDraft[];
  distractors: ItemDraft[];
  items: ItemDraft[];
  programming: ProgrammingDraft;
  tests: TestDraft[];
}

let counter = 0;
export const newKey = () => `k${++counter}`;

export const MEMORY_CHOICES = [64, 128, 256, 512, 1024];
export const OPTION_LETTERS = "ABCDEFGH";

export function defaultScoringMode(type: QuestionType): ScoringMode {
  return type === "multiple_choice" || !PARTIAL_SCORING_TYPES.includes(type) ? "all_or_nothing" : "partial";
}

export const emptyOption = (): OptionDraft => ({ key: newKey(), content: "", is_correct: false });
export const emptyItem = (): ItemDraft => ({ key: newKey(), text: "" });
export const emptyPair = (): PairDraft => ({ key: newKey(), left: "", right: "" });
export const emptyBlank = (): BlankDraft => ({ key: newKey(), accepted: [], case_sensitive: false });
export const emptyTest = (patch: Partial<TestDraft> = {}): TestDraft =>
  ({ key: newKey(), input: "", expected_output: "", is_public: false, ...patch });

export function emptyDraft(type: QuestionType, categoryId: number | null): QuestionDraft {
  return {
    type, category_id: categoryId, difficulty: "medium", content: "", explanation: "",
    scoring_mode: defaultScoringMode(type),
    options: [emptyOption(), emptyOption(), emptyOption(), emptyOption()],
    true_false: null, accepted: [], case_sensitive: false, numeric: { value: "", tolerance: "0" },
    blanks: [], pairs: [emptyPair(), emptyPair()], distractors: [], items: [emptyItem(), emptyItem(), emptyItem()],
    programming: {
      allowed_languages: [...ALL_LANGUAGES], time_limit_ms: "1000", memory_limit_mb: 256, checker_mode: "token",
      checker_epsilon: "1e-6", starter_codes: {}, solution_code: "", solution_language: null,
    },
    tests: [],
  };
}

export function draftFromQuestion(question: Question): QuestionDraft {
  const base = emptyDraft(question.type, question.category_id);
  const spec = question.answer_spec ?? {};
  const options = [...question.options].sort((a, b) => a.position - b.position);
  const p = question.programming;
  const legacyStarter = p?.starter_code ?? "";
  const allowed = p?.allowed_languages?.length ? p.allowed_languages : [...ALL_LANGUAGES];
  return {
    ...base,
    difficulty: question.difficulty,
    content: question.content,
    explanation: question.explanation ?? "",
    scoring_mode: question.scoring_mode ?? defaultScoringMode(question.type),
    options: options.length ? options.map((o) => ({ key: newKey(), content: o.content, is_correct: o.is_correct })) : base.options,
    true_false: question.type === "true_false" && options.length === 2 ? options[0].is_correct : null,
    accepted: spec.accepted ?? [],
    case_sensitive: !!spec.case_sensitive,
    numeric: { value: spec.value != null ? String(spec.value) : "", tolerance: spec.tolerance != null ? String(spec.tolerance) : "0" },
    blanks: (spec.blanks ?? []).map((b) => ({ key: newKey(), accepted: b.accepted ?? [], case_sensitive: !!b.case_sensitive })),
    pairs: spec.pairs?.length ? spec.pairs.map((pair) => ({ key: newKey(), ...pair })) : base.pairs,
    distractors: (spec.distractors ?? []).map((d) => ({ key: newKey(), ...d })),
    items: spec.items?.length ? spec.items.map((item) => ({ key: newKey(), ...item })) : base.items,
    programming: p ? {
      allowed_languages: allowed,
      time_limit_ms: String(p.time_limit_ms),
      memory_limit_mb: p.memory_limit_mb,
      checker_mode: p.checker_mode ?? "token",
      checker_epsilon: p.checker_epsilon != null ? String(p.checker_epsilon) : "1e-6",
      starter_codes: p.starter_codes ?? (legacyStarter ? Object.fromEntries(allowed.map((lang) => [lang, legacyStarter])) : {}),
      solution_code: p.solution_code ?? "",
      solution_language: p.solution_language ?? null,
    } : base.programming,
    tests: [...question.test_cases].sort((a, b) => a.position - b.position)
      .map((t) => emptyTest({ input: t.input, expected_output: t.expected_output, is_public: t.is_public })),
  };
}

/** Số đầu vào dạng chuỗi — nhận cả dấu phẩy thập phân. */
export function parseDecimal(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Số ô `[[n]]` cần có = số lớn nhất xuất hiện trong nội dung. */
export function blankMarkers(content: string): number[] {
  return [...content.matchAll(/\[\[(\d{1,2})\]\]/g)].map((match) => Number(match[1]));
}
export function blankCount(content: string): number {
  return Math.max(0, ...blankMarkers(content));
}
