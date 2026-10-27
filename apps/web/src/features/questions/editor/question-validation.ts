import { blankCount, blankMarkers, parseDecimal, type QuestionDraft } from "./question-draft";
import { byteSize, formatBytes, LIMITS, testsTotalBytes } from "./limits";
import { languageLabel } from "@/lib/languages";
import { FALLBACK_RULES, formatMs, type ProgrammingRules } from "./programming/programming-rules";

export type FieldErrors = Record<string, string>;

function checkAnswers(errors: FieldErrors, key: string, values: string[], min = 1) {
  const list = values.map((value) => value.trim()).filter(Boolean);
  if (list.length < min) errors[key] = "Cần ít nhất một đáp án chấp nhận.";
  else if (list.length > LIMITS.accepted) errors[key] = `Tối đa ${LIMITS.accepted} đáp án chấp nhận.`;
  else if (list.some((value) => value.length > LIMITS.answerText)) errors[key] = `Mỗi đáp án tối đa ${LIMITS.answerText} ký tự.`;
}

function checkOptions(errors: FieldErrors, draft: QuestionDraft) {
  const { options } = draft;
  if (options.length < LIMITS.options.min || options.length > LIMITS.options.max) errors.options = "Cần từ 2 đến 8 lựa chọn.";
  options.forEach((option, index) => { if (!option.content.trim()) errors[`options.${index}`] = "Nhập nội dung lựa chọn."; });
  const correct = options.filter((option) => option.is_correct).length;
  if (draft.type === "mcq" && correct !== 1) errors.options ??= "Chọn đúng một đáp án đúng.";
  if (draft.type === "multiple_choice" && correct < 1) errors.options ??= "Chọn ít nhất một đáp án đúng.";
}

function checkBlanks(errors: FieldErrors, draft: QuestionDraft) {
  const markers = blankMarkers(draft.content);
  const n = blankCount(draft.content);
  if (!n) { errors.blanks = "Nội dung cần ít nhất một ô [[1]]. Dùng nút “Chèn ô”."; return; }
  const sorted = [...markers].sort((a, b) => a - b);
  if (sorted.some((value, index) => value !== index + 1)) {
    errors.blanks = "Các ô phải đánh số liên tục từ [[1]] và không trùng nhau. Dùng “Đánh số lại”.";
  }
  draft.blanks.slice(0, n).forEach((blank, index) => checkAnswers(errors, `blanks.${index}`, blank.accepted));
}

function checkMatching(errors: FieldErrors, draft: QuestionDraft) {
  if (draft.pairs.length < LIMITS.pairs.min || draft.pairs.length > LIMITS.pairs.max) errors.pairs = "Cần từ 2 đến 12 cặp.";
  if (draft.distractors.length > LIMITS.distractors) errors.distractors = "Tối đa 6 đáp án nhiễu.";
  const seen = new Set<string>();
  const check = (key: string, text: string, unique: boolean) => {
    const value = text.trim();
    if (!value) errors[key] = "Không được để trống.";
    else if (value.length > LIMITS.pairText) errors[key] = `Tối đa ${LIMITS.pairText} ký tự.`;
    else if (unique && seen.has(value)) errors[key] = "Trùng với một mục bên phải khác.";
    if (unique) seen.add(value);
  };
  draft.pairs.forEach((pair, index) => { check(`pairs.${index}.left`, pair.left, false); check(`pairs.${index}.right`, pair.right, true); });
  draft.distractors.forEach((item, index) => check(`distractors.${index}`, item.text, true));
}

function checkOrdering(errors: FieldErrors, draft: QuestionDraft) {
  if (draft.items.length < LIMITS.items.min || draft.items.length > LIMITS.items.max) errors.items = "Cần từ 2 đến 12 mục.";
  const seen = new Set<string>();
  draft.items.forEach((item, index) => {
    const value = item.text.trim();
    if (!value) errors[`items.${index}`] = "Không được để trống.";
    else if (value.length > LIMITS.pairText) errors[`items.${index}`] = `Tối đa ${LIMITS.pairText} ký tự.`;
    else if (seen.has(value)) errors[`items.${index}`] = "Mục bị trùng.";
    seen.add(value);
  });
}

function checkProgramming(errors: FieldErrors, draft: QuestionDraft, rules: ProgrammingRules) {
  const p = draft.programming;
  const blocked = p.allowed_languages.filter((lang) => !rules.allowedLanguages.includes(lang));
  if (!p.allowed_languages.length) errors.languages = "Chọn ít nhất một ngôn ngữ.";
  else if (blocked.length) errors.languages = `Bỏ chọn ngôn ngữ hệ thống không còn cho phép: ${blocked.map(languageLabel).join(", ")}.`;
  const time = Number(p.time_limit_ms);
  if (!Number.isInteger(time) || time < LIMITS.timeMs.min || time > rules.maxTimeMs) errors.time_limit = `Từ ${LIMITS.timeMs.min} đến ${formatMs(rules.maxTimeMs)} ms.`;
  if (p.memory_limit_mb < LIMITS.memoryMb.min || p.memory_limit_mb > rules.maxMemoryMb) errors.memory_limit = `Từ ${LIMITS.memoryMb.min} đến ${formatMs(rules.maxMemoryMb)} MB.`;
  if (p.checker_mode === "float") {
    const eps = parseDecimal(p.checker_epsilon);
    if (eps == null || eps < LIMITS.epsilon.min || eps > LIMITS.epsilon.max) errors.epsilon = "Epsilon từ 1e-12 đến 1.";
  }
  for (const lang of p.allowed_languages) {
    if (byteSize(p.starter_codes[lang] ?? "") > LIMITS.starterBytes) errors[`starter.${lang}`] = "Code khởi đầu tối đa 64 KiB.";
  }
  if (p.solution_code.trim()) {
    if (byteSize(p.solution_code) > LIMITS.solutionBytes) errors.solution = "Lời giải tối đa 128 KiB.";
    if (!p.solution_language) errors.solution_language = "Chọn ngôn ngữ của lời giải.";
    else if (!p.allowed_languages.includes(p.solution_language)) errors.solution_language = "Ngôn ngữ lời giải phải nằm trong danh sách cho phép.";
  }
  const tests = draft.tests;
  if (tests.length < LIMITS.tests.min) errors.tests = "Cần ít nhất một test.";
  else if (tests.length > LIMITS.tests.max) errors.tests = "Tối đa 100 test.";
  else if (testsTotalBytes(tests) > LIMITS.totalTestBytes) errors.tests = `Tổng dung lượng test vượt ${formatBytes(LIMITS.totalTestBytes)}.`;
  tests.forEach((test, index) => {
    const key = `tests.${index}`;
    if (byteSize(test.input) > LIMITS.inputBytes) errors[key] = "Input vượt 128 KiB.";
    else if (byteSize(test.expected_output) > LIMITS.expectedBytes) errors[key] = "Output vượt 64 KiB.";
    else if (!test.expected_output.trim()) errors[key] = "Chưa có output mong đợi.";
  });
  if (!errors.tests && tests.some((_, index) => errors[`tests.${index}`])) errors.tests = "Có test chưa hợp lệ — xem các dòng được đánh dấu.";
}

/** Kiểm tra phía client đúng ràng buộc §1–4 trước khi gửi. */
export function validateDraft(draft: QuestionDraft, rules: ProgrammingRules = FALLBACK_RULES): FieldErrors {
  const errors: FieldErrors = {};
  if (!draft.content.trim()) errors.content = "Nhập nội dung câu hỏi.";
  else if (draft.content.length > LIMITS.content) errors.content = "Nội dung tối đa 60.000 ký tự.";
  if (draft.explanation.length > LIMITS.explanation) errors.explanation = "Giải thích tối đa 10.000 ký tự.";
  switch (draft.type) {
    case "mcq": case "multiple_choice": checkOptions(errors, draft); break;
    case "true_false": if (draft.true_false == null) errors.true_false = "Chọn đáp án Đúng hoặc Sai."; break;
    case "short_answer": checkAnswers(errors, "accepted", draft.accepted); break;
    case "numeric": {
      if (parseDecimal(draft.numeric.value) == null) errors["numeric.value"] = "Nhập một số hợp lệ.";
      const tolerance = parseDecimal(draft.numeric.tolerance);
      if (tolerance == null || tolerance < 0) errors["numeric.tolerance"] = "Sai số là số ≥ 0.";
      break;
    }
    case "fill_blank": checkBlanks(errors, draft); break;
    case "matching": checkMatching(errors, draft); break;
    case "ordering": checkOrdering(errors, draft); break;
    case "programming": checkProgramming(errors, draft, rules); break;
  }
  return errors;
}
