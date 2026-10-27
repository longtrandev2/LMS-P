import { useQueries, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { utcDateTimeMillis } from "@/lib/date-time";
import { queryKeys } from "@/lib/query-keys";
import { classAssignmentsQuery } from "@/features/classes/class-assignments-query";
import type { AssignmentSubmission, AssignmentSummary, Paginated, QuizAttempt } from "@/types/api";

export type ProgressGroup = "open" | "upcoming" | "closed";
export interface ProgressItem {
  assignment: AssignmentSummary;
  group: ProgressGroup;
  /** Mốc đóng hẳn (hạn nộp muộn nếu có). */
  closeMs: number;
  /** Hạn hiệu lực để đếm ngược: hạn chính, hoặc hạn nộp muộn khi đã quá hạn chính. */
  dueMs: number;
  /** undefined = đang tải / không xác định. */
  submitted?: boolean;
}

const asList = <T,>(data: T[] | Paginated<T>): T[] => (Array.isArray(data) ? data : data.items);

function groupOf(a: AssignmentSummary, now: number): { group: ProgressGroup; closeMs: number; dueMs: number } {
  const due = utcDateTimeMillis(a.due_at);
  const closeMs = a.allow_late && a.late_due_at ? Math.max(due, utcDateTimeMillis(a.late_due_at)) : due;
  const dueMs = now <= due ? due : closeMs;
  if (a.available_from && now < utcDateTimeMillis(a.available_from)) return { group: "upcoming", closeMs, dueMs };
  return { group: now > closeMs ? "closed" : "open", closeMs, dueMs };
}

/**
 * Tiến độ của sinh viên trong một lớp: bài đã xuất bản (một `GET /classes/{id}/assignments`) + trạng thái đã nộp
 * của từng bài đã mở (quiz: `GET /assignments/{id}/quiz-attempts`, còn lại: `GET /me/submissions?assignment_id=`).
 * Dùng cùng query key với trang bài của sinh viên nên mở bài xong quay lại không tải lại.
 */
export function useClassProgress(classId: string, enabled = true) {
  const list = useQuery({ ...classAssignmentsQuery(classId), enabled });
  const now = Date.now();
  const base = (list.data?.items ?? []).filter((a) => a.is_published).map((assignment) => ({ assignment, ...groupOf(assignment, now) }));
  const started = base.filter((item) => item.group !== "upcoming");
  const results = useQueries({
    queries: started.map(({ assignment: a }) => a.category === "quiz"
      ? {
        queryKey: queryKeys.assignments.quizAttempts(a.id),
        queryFn: async ({ signal }: { signal: AbortSignal }) =>
          asList(await api.get<QuizAttempt[] | Paginated<QuizAttempt>>(`/assignments/${a.id}/quiz-attempts`, undefined, signal))
            .sort((x, y) => y.attempt_no - x.attempt_no),
      }
      : {
        queryKey: queryKeys.assignments.mySubmissions(a.id),
        queryFn: async ({ signal }: { signal: AbortSignal }) => asList(await api.get<AssignmentSubmission[] | Paginated<AssignmentSubmission>>(
          "/me/submissions", { assignment_id: a.id, page: 1, limit: 100 }, signal)),
      }),
  });
  const submittedById = new Map<number, boolean>();
  started.forEach((item, index) => {
    const data = results[index]?.data as unknown[] | undefined;
    if (data) submittedById.set(item.assignment.id, data.length > 0);
  });
  const items: ProgressItem[] = base
    .map((item) => ({ ...item, submitted: item.group === "upcoming" ? false : submittedById.get(item.assignment.id) }))
    .sort((a, b) => a.dueMs - b.dueMs);
  const total = items.length;
  const done = items.filter((item) => item.submitted).length;
  const ready = list.isSuccess && results.every((r) => !r.isPending);
  const submittedIds = new Set(items.filter((item) => item.submitted).map((item) => item.assignment.id));
  return { list, items, total, done, ready, submittedIds, percent: total > 0 ? Math.round((done / total) * 100) : 0 };
}

export type ClassProgress = ReturnType<typeof useClassProgress>;
