// Nháp đáp án/code lưu localStorage — docs/assessment-spec.md §8. Lỗi storage (chế độ riêng tư, đầy) bị bỏ qua.

export const draftKeys = {
  /** Nháp lượt quiz thứ `attemptNo` (= số lượt đã nộp + 1). */
  quiz: (userId: number, assignmentId: number, attemptNo: number) => `lms:draft:quiz:${userId}:${assignmentId}:${attemptNo}`,
  /** Nháp câu khách quan nộp từng câu. */
  answer: (userId: number, assignmentId: number, questionId: number) => `lms:draft:answer:${userId}:${assignmentId}:${questionId}`,
  code: (userId: number, assignmentId: number, questionId: number, language: string) =>
    `lms:draft:code:${userId}:${assignmentId}:${questionId}:${language}`,
  codeLanguage: (userId: number, assignmentId: number, questionId: number) =>
    `lms:draft:code-lang:${userId}:${assignmentId}:${questionId}`,
};

export function readDraft<T>(key: string | null): T | null {
  if (!key) return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeDraft(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* hết dung lượng / bị chặn — nháp chỉ là tiện ích */
  }
}

export function removeDraft(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* bỏ qua */
  }
}
