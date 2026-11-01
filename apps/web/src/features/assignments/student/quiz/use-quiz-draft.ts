import { useCallback, useEffect, useRef, useState } from "react";
import type { AssignmentQuestion } from "@/types/api";
import { isAnswered, type DraftAnswer } from "../answers/answer-model";
import { readDraft, removeDraft, writeDraft } from "../local-draft";

interface QuizDraft {
  answers: Record<number, DraftAnswer>;
  flagged: number[];
  current: number;
}

function loadDraft(key: string): QuizDraft | null {
  const saved = readDraft<Partial<QuizDraft>>(key);
  if (!saved || typeof saved !== "object") return null;
  return {
    answers: saved.answers && typeof saved.answers === "object" ? saved.answers : {},
    flagged: Array.isArray(saved.flagged) ? saved.flagged.filter((id) => typeof id === "number") : [],
    current: typeof saved.current === "number" ? saved.current : 0,
  };
}

/**
 * Bài làm quiz đang dở: câu trả lời, câu đánh dấu, câu đang xem.
 * Tự lưu localStorage theo `key` (user, bài, số lượt đã nộp + 1) sau mỗi thay đổi; `finish()` xóa nháp và ngừng lưu.
 */
export function useQuizDraft(key: string, questions: AssignmentQuestion[]) {
  const [initial] = useState(() => loadDraft(key));
  const [answers, setAnswers] = useState<Record<number, DraftAnswer>>(initial?.answers ?? {});
  const [flagged, setFlagged] = useState<number[]>(initial?.flagged ?? []);
  const [current, setCurrent] = useState(initial?.current ?? 0);
  const finished = useRef(false);

  const answeredCount = questions.filter((question) => isAnswered(question, answers[question.question_id])).length;
  const dirty = answeredCount > 0 || flagged.length > 0;
  const restored = initial != null && (Object.keys(initial.answers).length > 0 || initial.flagged.length > 0);

  useEffect(() => {
    if (finished.current) return;
    if (dirty) writeDraft(key, { answers, flagged, current } satisfies QuizDraft);
    else removeDraft(key);
  }, [key, answers, flagged, current, dirty]);

  const setAnswer = useCallback((questionId: number, value: DraftAnswer) => {
    setAnswers((previous) => ({ ...previous, [questionId]: value }));
  }, []);

  const toggleFlag = useCallback((questionId: number) => {
    setFlagged((previous) => previous.includes(questionId) ? previous.filter((id) => id !== questionId) : [...previous, questionId]);
  }, []);

  const finish = useCallback(() => {
    finished.current = true;
    removeDraft(key);
  }, [key]);

  return { answers, flagged, current, setCurrent, setAnswer, toggleFlag, finish, answeredCount, dirty, restored };
}
