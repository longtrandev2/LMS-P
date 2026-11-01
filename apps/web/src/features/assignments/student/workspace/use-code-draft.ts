import { useCallback, useEffect, useRef, useState } from "react";
import type { ProgrammingLanguage } from "@/types/api";
import { draftKeys, readDraft, removeDraft, writeDraft } from "../local-draft";

interface Options {
  userId: number | null;
  assignmentId: number;
  questionId: number;
  allowed: ProgrammingLanguage[];
  starterFor: (language: ProgrammingLanguage) => string;
}

/**
 * Code + ngôn ngữ của workspace. Nháp lưu theo (user, bài, câu, ngôn ngữ) — ghi trễ 400 ms, ghi ngay khi rời trang.
 * Đổi ngôn ngữ nạp nháp của ngôn ngữ đó, chưa có thì nạp code mẫu. Code trùng code mẫu thì không lưu nháp.
 */
export function useCodeDraft({ userId, assignmentId, questionId, allowed, starterFor }: Options) {
  const languageKey = userId != null ? draftKeys.codeLanguage(userId, assignmentId, questionId) : null;
  const codeKey = (language: ProgrammingLanguage) => userId != null ? draftKeys.code(userId, assignmentId, questionId, language) : null;
  const load = (language: ProgrammingLanguage) => readDraft<string>(codeKey(language)) ?? starterFor(language);

  const [language, setLanguageState] = useState<ProgrammingLanguage>(() => {
    const saved = readDraft<string>(languageKey);
    return allowed.find((item) => item === saved) ?? allowed[0];
  });
  const [code, setCodeState] = useState(() => load(language));
  const pending = useRef<{ key: string; value: string; starter: string } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    const next = pending.current;
    pending.current = null;
    if (!next) return;
    if (next.value === next.starter) removeDraft(next.key);
    else writeDraft(next.key, next.value);
  }, []);

  useEffect(() => {
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [flush]);

  function setCode(value: string) {
    setCodeState(value);
    const key = codeKey(language);
    if (!key) return;
    pending.current = { key, value, starter: starterFor(language) };
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 400);
  }

  function setLanguage(next: ProgrammingLanguage) {
    if (next === language) return;
    flush();
    setLanguageState(next);
    if (languageKey) writeDraft(languageKey, next);
    setCodeState(load(next));
  }

  function restoreStarter() {
    pending.current = null;
    window.clearTimeout(timer.current);
    const key = codeKey(language);
    if (key) removeDraft(key);
    setCodeState(starterFor(language));
  }

  return { language, setLanguage, code, setCode, restoreStarter, isStarter: code === starterFor(language) };
}
