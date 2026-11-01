import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import { usePublicSettings } from "@/lib/use-public-settings";
import type { Question, QuestionType } from "@/types/api";
import { defaultScoringMode, draftFromQuestion, emptyDraft, type QuestionDraft } from "./question-draft";
import { draftSignature, draftToInput } from "./question-input";
import { validateDraft, type FieldErrors } from "./question-validation";
import { FALLBACK_RULES, rulesFromSettings, type ProgrammingRules } from "./programming/programming-rules";

/** Cuộn và focus vào trường lỗi đầu tiên (theo `data-field`, thử dần tiền tố ngắn hơn). */
function focusFirstError(errors: FieldErrors) {
  const first = Object.keys(errors)[0];
  if (!first) return;
  const parts = first.split(".");
  for (let size = parts.length; size > 0; size--) {
    const el = document.querySelector<HTMLElement>(`[data-field="${parts.slice(0, size).join(".")}"]`);
    if (!el) continue;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.querySelector<HTMLElement>("[aria-invalid=true], textarea, input:not([type=file]), button")?.focus({ preventScroll: true });
    return;
  }
}

/** Câu mới tạo trước khi cấu hình tải xong: thay các giá trị điền sẵn còn nguyên bằng giá trị theo cấu hình. */
function applyRules(draft: QuestionDraft, rules: ProgrammingRules): QuestionDraft {
  const p = draft.programming;
  const fallback = FALLBACK_RULES;
  const untouchedLangs = p.allowed_languages.join() === fallback.allowedLanguages.join();
  return { ...draft, programming: {
    ...p,
    allowed_languages: untouchedLangs ? [...rules.allowedLanguages] : p.allowed_languages,
    time_limit_ms: p.time_limit_ms === String(fallback.defaultTimeMs) ? String(rules.defaultTimeMs) : p.time_limit_ms,
    memory_limit_mb: p.memory_limit_mb === fallback.defaultMemoryMb ? rules.defaultMemoryMb : p.memory_limit_mb,
  } };
}

/** Trạng thái form soạn câu: draft, phát hiện thay đổi, kiểm tra client và lưu một request. */
export function useQuestionForm({ question, bankId, initialType, initialCategory }: {
  question: Question | null; bankId: number; initialType: QuestionType; initialCategory: number | null;
}) {
  const settings = usePublicSettings();
  const rules = useMemo(() => rulesFromSettings(settings.data), [settings.data]);
  const [draft, setDraft] = useState<QuestionDraft>(() => question ? draftFromQuestion(question) : emptyDraft(initialType, initialCategory, rules));
  const [baseline, setBaseline] = useState(() => draftSignature(draft));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const rulesApplied = useRef(question != null || settings.data != null);
  useEffect(() => {
    if (rulesApplied.current || !settings.data) return;
    rulesApplied.current = true;
    setDraft((d) => applyRules(d, rules));
  }, [settings.data, rules]);
  const signature = useMemo(() => draftSignature(draft), [draft]);
  // Câu mới: chỉ coi là thay đổi khi khác bản trống của loại đang chọn (đổi loại chưa nhập gì không cần cảnh báo).
  const dirty = signature !== baseline && (question != null || signature !== draftSignature(emptyDraft(draft.type, initialCategory, rules)));
  const errors = useMemo(() => submitted ? validateDraft(draft, rules) : {}, [submitted, draft, rules]);

  const update = useCallback((recipe: (d: QuestionDraft) => QuestionDraft) => setDraft(recipe), []);
  const patch = useCallback((value: Partial<QuestionDraft>) => setDraft((d) => ({ ...d, ...value })), []);
  const changeType = useCallback((type: QuestionType) => setDraft((d) => d.type === type ? d : { ...d, type, scoring_mode: defaultScoringMode(type) }), []);

  async function save(): Promise<Question | null> {
    const found = validateDraft(draft, rules);
    setSubmitted(true);
    const count = Object.keys(found).length;
    if (count) {
      toast.error(count === 1 ? "Còn 1 lỗi cần sửa trước khi lưu." : `Còn ${count} lỗi cần sửa trước khi lưu.`);
      requestAnimationFrame(() => focusFirstError(found));
      return null;
    }
    setSaving(true);
    try {
      const body = draftToInput(draft, bankId);
      const saved = question
        ? await api.patch<Question>(`/questions/${question.id}`, body)
        : await api.post<Question>("/questions", body);
      const next = draftFromQuestion(saved);
      setDraft(next);
      setBaseline(draftSignature(next));
      setSubmitted(false);
      return saved;
    } catch (error) {
      toast.error(errorText(error));
      return null;
    } finally {
      setSaving(false);
    }
  }

  return { draft, update, patch, changeType, errors, dirty, saving, save, rules };
}
