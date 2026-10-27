// Bản sao phòng thi trên trình duyệt theo session_id (exam-spec §5.4): các câu chưa lưu được, câu đánh dấu, câu đang xem.
import { serverMillis } from "../exam-labels";
import type { AttemptSessionView, SessionAnswerInput } from "@/types/exams";
import { fromResponse, type DraftAnswer } from "@/features/assignments/student/answers/answer-model";
import { readDraft, removeDraft, writeDraft } from "@/features/assignments/student/local-draft";
import type { CodeAnswer } from "./room-model";

/** Một thay đổi chưa được server xác nhận; `at` theo giờ server (ms). */
export interface PendingItem { entry: SessionAnswerInput; draft?: DraftAnswer; at: number }
export interface RoomBackup { pending: Record<string, PendingItem>; flagged: number[]; current: number }

const keyOf = (sessionId: number) => `lms:exam:session:${sessionId}`;
const EMPTY: RoomBackup = { pending: {}, flagged: [], current: 0 };

export function readBackup(sessionId: number): RoomBackup {
  const saved = readDraft<Partial<RoomBackup>>(keyOf(sessionId));
  if (!saved || typeof saved !== "object") return EMPTY;
  return {
    pending: saved.pending && typeof saved.pending === "object" ? saved.pending : {},
    flagged: Array.isArray(saved.flagged) ? saved.flagged.filter((id) => typeof id === "number") : [],
    current: typeof saved.current === "number" ? saved.current : 0,
  };
}

export function updateBackup(sessionId: number, change: Partial<RoomBackup>): void {
  writeDraft(keyOf(sessionId), { ...readBackup(sessionId), ...change });
}

export function clearBackup(sessionId: number): void {
  removeDraft(keyOf(sessionId));
}

export interface RestoredRoom {
  answers: Record<number, DraftAnswer>;
  codes: Record<number, CodeAnswer>;
  flagged: number[];
  current: number;
  pending: Map<number, PendingItem>;
}

/**
 * Trạng thái ban đầu: câu trả lời đã lưu trên server, phủ bằng thay đổi chưa lưu trong bản sao nếu thay đổi đó
 * mới hơn bản trên server (server mới hơn thì server thắng và bỏ bản sao).
 */
export function restoreRoom(view: AttemptSessionView): RestoredRoom {
  const answers: Record<number, DraftAnswer> = {};
  const codes: Record<number, CodeAnswer> = {};
  const savedAt = new Map<number, number>();
  for (const saved of view.answers) {
    savedAt.set(saved.question_id, serverMillis(saved.updated_at));
    if (saved.source_code != null && saved.language) {
      codes[saved.question_id] = { language: saved.language as CodeAnswer["language"], source_code: saved.source_code };
    } else if (saved.response) answers[saved.question_id] = fromResponse(saved.response);
  }
  const backup = readBackup(view.session.id);
  const valid = new Set(view.sections.flatMap((section) => section.questions.map((question) => question.question_id)));
  const pending = new Map<number, PendingItem>();
  for (const item of Object.values(backup.pending)) {
    const id = item?.entry?.question_id;
    if (typeof id !== "number" || !valid.has(id)) continue;
    const server = savedAt.get(id);
    if (server != null && !(item.at > server)) continue;
    pending.set(id, item);
    if (item.entry.code) codes[id] = { language: item.entry.code.language as CodeAnswer["language"], source_code: item.entry.code.source_code };
    else if (item.entry.answer || item.draft) answers[id] = item.draft ?? fromResponse(item.entry.answer);
    else { answers[id] = {}; delete codes[id]; }
  }
  updateBackup(view.session.id, { pending: Object.fromEntries(pending) });
  return { answers, codes, flagged: backup.flagged.filter((id) => valid.has(id)), current: backup.current, pending };
}
