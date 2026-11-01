import { useQueries } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { AssignmentSummary, ClassSummary } from "@/types/api";
import { classAssignmentsQuery, openDeadlines } from "./class-assignments-query";
import type { DeadlineRow } from "./deadline-list";

/**
 * Gộp bài đã xuất bản, chưa đóng của nhiều lớp (mỗi lớp một `GET /classes/{id}/assignments`,
 * số lớp nhỏ) → hàng "Sắp đến hạn" sắp theo hạn + số bài đang mở theo lớp.
 */
export function useClassesDeadlines(
  classes: ClassSummary[],
  hrefFor: (clazz: ClassSummary, item: AssignmentSummary) => string,
  isStudent = false,
) {
  const results = useQueries({ queries: classes.map((clazz) => classAssignmentsQuery(clazz.id)) });
  const rawDeadlines: { clazz: ClassSummary; d: ReturnType<typeof openDeadlines>[number] }[] = [];
  const openCount = new Map<number, number>();

  classes.forEach((clazz, index) => {
    const data = results[index]?.data;
    if (!data) return;
    const deadlines = openDeadlines(data.items);
    openCount.set(clazz.id, deadlines.filter((d) => d.state !== "upcoming").length);
    for (const d of deadlines) rawDeadlines.push({ clazz, d });
  });

  const checkable = isStudent ? rawDeadlines.filter((item) => item.d.state !== "upcoming") : [];
  const submissionQueries = useQueries({
    queries: checkable.map(({ d }) => ({
      queryKey: d.assignment.category === "quiz"
        ? queryKeys.assignments.quizAttempts(d.assignment.id)
        : queryKeys.assignments.mySubmissions(d.assignment.id),
      queryFn: async ({ signal }: { signal: AbortSignal }) => {
        const url = d.assignment.category === "quiz" ? `/assignments/${d.assignment.id}/quiz-attempts` : "/me/submissions";
        const params = d.assignment.category === "quiz" ? undefined : { assignment_id: d.assignment.id };
        const res = await api.get<unknown>(url, params, signal);
        return Array.isArray(res) ? res : (res as { items?: unknown[] })?.items ?? [];
      },
      staleTime: 30_000,
    })),
  });

  const submittedMap = new Map<number, boolean>();
  checkable.forEach(({ d }, index) => {
    const list = submissionQueries[index]?.data as unknown[] | undefined;
    if (list && list.length > 0) submittedMap.set(d.assignment.id, true);
  });

  const rows: DeadlineRow[] = rawDeadlines.map(({ clazz, d }) => ({
    ...d,
    classCode: clazz.code,
    href: hrefFor(clazz, d.assignment),
    submitted: submittedMap.get(d.assignment.id) ?? false,
  }));
  rows.sort((a, b) => a.dueMs - b.dueMs);
  return {
    rows,
    openCount,
    isPending: results.some((r) => r.isPending),
    failed: results.filter((r) => r.isError).length,
    refetchFailed: () => results.forEach((r) => { if (r.isError) void r.refetch(); }),
  };
}
