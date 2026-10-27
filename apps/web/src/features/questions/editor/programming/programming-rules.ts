import { ALL_LANGUAGES } from "@/lib/languages";
import type { PublicSettings } from "@/types/admin";
import type { ProgrammingLanguage } from "@/types/api";
import { LIMITS } from "../limits";

/** Ràng buộc soạn câu lập trình lấy từ cấu hình hệ thống — docs/admin-spec.md §1. */
export interface ProgrammingRules {
  allowedLanguages: ProgrammingLanguage[];
  defaultTimeMs: number;
  defaultMemoryMb: number;
  maxTimeMs: number;
  maxMemoryMb: number;
}

/** Khi chưa tải được cấu hình: dùng mặc định của hệ thống (bảng §1). */
export const FALLBACK_RULES: ProgrammingRules = {
  allowedLanguages: [...ALL_LANGUAGES],
  defaultTimeMs: 1000,
  defaultMemoryMb: 256,
  maxTimeMs: LIMITS.timeMs.max,
  maxMemoryMb: LIMITS.memoryMb.max,
};

export function rulesFromSettings(settings: PublicSettings | undefined): ProgrammingRules {
  if (!settings) return FALLBACK_RULES;
  const allowed = ALL_LANGUAGES.filter((id) => settings.allowed_languages.includes(id));
  return {
    allowedLanguages: allowed.length ? allowed : FALLBACK_RULES.allowedLanguages,
    defaultTimeMs: settings.default_time_limit_ms,
    defaultMemoryMb: settings.default_memory_limit_mb,
    maxTimeMs: settings.max_time_limit_ms,
    maxMemoryMb: settings.max_memory_limit_mb,
  };
}

/** Các mức bộ nhớ cho Select: bội số 2 trong [min, max] + mặc định + giá trị đang chọn. */
export function memoryChoices(rules: ProgrammingRules, current: number): number[] {
  const steps = [32, 64, 128, 256, 512, 1024, 2048].filter((mb) => mb >= LIMITS.memoryMb.min && mb <= rules.maxMemoryMb);
  return [...new Set([...steps, rules.defaultMemoryMb, current])].sort((a, b) => a - b);
}

export const formatMs = (ms: number) => ms.toLocaleString("vi-VN");
