// Mô hình dữ liệu phòng thi — docs/exam-spec.md §5.3, §5.4, §8.1.
import { ALL_LANGUAGES, DEFAULT_STARTERS } from "@/lib/languages";
import type { AssignmentQuestion, ProgrammingLanguage } from "@/types/api";
import type { AttemptSessionView, SessionAnswerInput } from "@/types/exams";
import { isAnswered, toAnswer, type DraftAnswer } from "@/features/assignments/student/answers/answer-model";

export interface CodeAnswer { language: ProgrammingLanguage; source_code: string }
export interface RoomQuestion { question: AssignmentQuestion; index: number; section: number }
export interface RoomSection { label: string | null; items: RoomQuestion[] }

/** Phần giữ thứ tự hiển thị của server; câu đánh số liên tục qua các phần. */
export function buildSections(view: AttemptSessionView): { sections: RoomSection[]; list: RoomQuestion[] } {
  const list: RoomQuestion[] = [];
  const named = view.sections.length > 1 || view.sections.some((section) => section.title.trim());
  const sections = view.sections.map((section, sectionIndex) => {
    const items = section.questions.map((question) => {
      const item = { question, index: list.length, section: sectionIndex };
      list.push(item);
      return item;
    });
    return { label: named ? section.title.trim() || `Phần ${sectionIndex + 1}` : null, items };
  });
  return { sections: sections.filter((section) => section.items.length > 0), list };
}

export function allowedLanguages(question: AssignmentQuestion): ProgrammingLanguage[] {
  const allowed = question.programming?.allowed_languages;
  return allowed?.length ? allowed : ALL_LANGUAGES;
}

export function starterFor(question: AssignmentQuestion, language: ProgrammingLanguage): string {
  return question.programming?.starter_codes?.[language] ?? DEFAULT_STARTERS[language];
}

/** Câu lập trình tính là đã làm khi có code khác rỗng và khác code mẫu. */
export function codeAnswered(question: AssignmentQuestion, code: CodeAnswer | undefined): boolean {
  if (!code?.source_code.trim()) return false;
  return code.source_code !== starterFor(question, code.language);
}

export function questionAnswered(question: AssignmentQuestion, answers: Record<number, DraftAnswer>, codes: Record<number, CodeAnswer>): boolean {
  return question.type === "programming"
    ? codeAnswered(question, codes[question.question_id])
    : isAnswered(question, answers[question.question_id]);
}

/** Một mục tự lưu: câu khách quan gửi `answer` đầy đủ (gồm `question_id`); bỏ trống = không gửi gì (xóa). */
export function objectiveEntry(question: AssignmentQuestion, draft: DraftAnswer): SessionAnswerInput {
  const answer = toAnswer(question, draft);
  return answer ? { question_id: question.question_id, answer } : { question_id: question.question_id };
}

export function codeEntry(questionId: number, code: CodeAnswer): SessionAnswerInput {
  return { question_id: questionId, code: { language: code.language, source_code: code.source_code } };
}
