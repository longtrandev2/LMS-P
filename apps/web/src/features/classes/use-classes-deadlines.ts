import { useQueries } from "@tanstack/react-query";
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
) {
  const results = useQueries({ queries: classes.map((clazz) => classAssignmentsQuery(clazz.id)) });
  const rows: DeadlineRow[] = [];
  const openCount = new Map<number, number>();
  classes.forEach((clazz, index) => {
    const data = results[index]?.data;
    if (!data) return;
    const deadlines = openDeadlines(data.items);
    openCount.set(clazz.id, deadlines.filter((d) => d.state !== "upcoming").length);
    for (const d of deadlines) rows.push({ ...d, classCode: clazz.code, href: hrefFor(clazz, d.assignment) });
  });
  rows.sort((a, b) => a.dueMs - b.dueMs);
  return {
    rows,
    openCount,
    isPending: results.some((r) => r.isPending),
    failed: results.filter((r) => r.isError).length,
    refetchFailed: () => results.forEach((r) => { if (r.isError) void r.refetch(); }),
  };
}
