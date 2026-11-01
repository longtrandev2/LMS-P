import { useCallback, useEffect, useRef, useState } from "react";
import type { AssignmentQuestion, ProgrammingLanguage } from "@/types/api";
import type { SessionAnswerInput } from "@/types/exams";
import type { DraftAnswer } from "@/features/assignments/student/answers/answer-model";
import { updateBackup, type RestoredRoom } from "./local-backup";
import { codeEntry, objectiveEntry, starterFor, type CodeAnswer } from "./room-model";

const MAX_SOURCE_BYTES = 128 * 1024;

/**
 * Bài làm trong phòng thi: câu trả lời khách quan, code từng câu, câu đánh dấu (chỉ trên máy), câu đang xem.
 * Mỗi thay đổi đưa vào hàng đợi tự lưu; đổi ngôn ngữ giữ code của ngôn ngữ cũ trong bộ nhớ để quay lại.
 */
export function useRoomAnswers(sessionId: number, restored: RestoredRoom, queue: (entry: SessionAnswerInput, draft?: DraftAnswer) => void) {
  const [answers, setAnswers] = useState(restored.answers);
  const [codes, setCodes] = useState(restored.codes);
  const [flagged, setFlagged] = useState(restored.flagged);
  const [current, setCurrent] = useState(restored.current);
  const codeCache = useRef(new Map<string, string>());

  useEffect(() => { updateBackup(sessionId, { flagged, current }); }, [sessionId, flagged, current]);

  const setAnswer = useCallback((question: AssignmentQuestion, draft: DraftAnswer) => {
    setAnswers((previous) => ({ ...previous, [question.question_id]: draft }));
    queue(objectiveEntry(question, draft), draft);
  }, [queue]);

  const setCode = useCallback((question: AssignmentQuestion, code: CodeAnswer) => {
    setCodes((previous) => ({ ...previous, [question.question_id]: code }));
    codeCache.current.set(`${question.question_id}:${code.language}`, code.source_code);
    // Code quá 128 KiB server từ chối — giữ trên máy, không gửi.
    if (new Blob([code.source_code]).size <= MAX_SOURCE_BYTES) queue(codeEntry(question.question_id, code));
  }, [queue]);

  const setLanguage = useCallback((question: AssignmentQuestion, language: ProgrammingLanguage, previous: CodeAnswer | undefined) => {
    if (previous) codeCache.current.set(`${question.question_id}:${previous.language}`, previous.source_code);
    const source = codeCache.current.get(`${question.question_id}:${language}`) ?? starterFor(question, language);
    setCode(question, { language, source_code: source });
  }, [setCode]);

  const toggleFlag = useCallback((questionId: number) => {
    setFlagged((previous) => previous.includes(questionId) ? previous.filter((id) => id !== questionId) : [...previous, questionId]);
  }, []);

  return { answers, codes, flagged, current, setCurrent, setAnswer, setCode, setLanguage, toggleFlag };
}
