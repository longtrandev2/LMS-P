// Route trang sinh viên — docs/assessment-spec.md §8.
type Id = number | string;

export const studentPaths = {
  classPage: (classId: Id) => `/me/classes/${classId}`,
  overview: (classId: Id, assignmentId: Id) => `/me/classes/${classId}/assignments/${assignmentId}`,
  attempt: (classId: Id, assignmentId: Id) => `/me/classes/${classId}/assignments/${assignmentId}/attempt`,
  review: (classId: Id, assignmentId: Id, attemptId: Id) => `/me/classes/${classId}/assignments/${assignmentId}/attempts/${attemptId}`,
  problem: (classId: Id, assignmentId: Id, questionId: Id) => `/me/classes/${classId}/assignments/${assignmentId}/problems/${questionId}`,
  submission: (submissionId: Id) => `/submissions/${submissionId}`,
};

/** Đọc số nguyên dương từ route param; sai → NaN (query bị tắt). */
export function routeId(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : Number.NaN;
}
