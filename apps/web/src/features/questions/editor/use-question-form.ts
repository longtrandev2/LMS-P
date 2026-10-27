import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import type { Question, QuestionType } from "@/types/api";
import { defaultScoringMode, draftFromQuestion, emptyDraft, type QuestionDraft } from "./question-draft";
import { draftSignature, draftToInput } from "./question-input";
import { validateDraft, type FieldErrors } from "./question-validation";

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

/** Trạng thái form soạn câu: draft, phát hiện thay đổi, kiểm tra client và lưu một request. */
export function useQuestionForm({ question, bankId, initialType, initialCategory }: {
  question: Question | null; bankId: number; initialType: QuestionType; initialCategory: number | null;
}) {
  const [draft, setDraft] = useState<QuestionDraft>(() => question ? draftFromQuestion(question) : emptyDraft(initialType, initialCategory));
  const [baseline, setBaseline] = useState(() => draftSignature(draft));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const signature = useMemo(() => draftSignature(draft), [draft]);
  // Câu mới: chỉ coi là thay đổi khi khác bản trống của loại đang chọn (đổi loại chưa nhập gì không cần cảnh báo).
  const dirty = signature !== baseline && (question != null || signature !== draftSignature(emptyDraft(draft.type, initialCategory)));
  const errors = useMemo(() => submitted ? validateDraft(draft) : {}, [submitted, draft]);

  const update = useCallback((recipe: (d: QuestionDraft) => QuestionDraft) => setDraft(recipe), []);
  const patch = useCallback((value: Partial<QuestionDraft>) => setDraft((d) => ({ ...d, ...value })), []);
  const changeType = useCallback((type: QuestionType) => setDraft((d) => d.type === type ? d : { ...d, type, scoring_mode: defaultScoringMode(type) }), []);

  async function save(): Promise<Question | null> {
    const found = validateDraft(draft);
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

  return { draft, update, patch, changeType, errors, dirty, saving, save };
}
