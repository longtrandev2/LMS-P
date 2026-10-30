/** Chuẩn hoá cache keys cho TanStack Query */

export const queryKeys = {
  users: {
    all: ["users"] as const,
    list: (filters: { page: number; limit: number; role?: string; status?: string; q?: string; sort?: string }) =>
      ["users", "list", filters] as const,
    onlineIds: ["users", "online-ids"] as const,
  },
  audit: { list: (filters: Record<string, string | number | undefined>) => ["audit", "list", filters] as const },
  courses: {
    all: ["courses"] as const,
    list: (filters?: { page?: number; limit?: number; q?: string; sort?: string }) => ["courses", "list", filters] as const,
    detail: (id: string) => ["courses", "detail", id] as const,
  },
  questions: {
    all: ["questions"] as const,
    list: (filters: Record<string, string | number | undefined>) => ["questions", "list", filters] as const,
    detail: (id: number) => ["questions", "detail", id] as const,
    draw: (rules: unknown) => ["questions", "draw", rules] as const,
  },
  runJobs: {
    detail: (runId: string) => ["run-jobs", runId] as const,
  },
  questionBanks: {
    all: ["question-banks"] as const,
    list: (courseId?: number) => ["question-banks", "list", courseId] as const,
    categories: (bankId?: number) => ["question-banks", bankId, "categories"] as const,
  },
  assignments: {
    all: ["assignments"] as const,
    class: (classId: string) => ["assignments", "class", classId] as const,
    details: (id: number) => ["assignments", "detail", id] as const,
    quizAttempts: (id: number) => ["assignments", id, "quiz-attempts"] as const,
    submissions: (id: number) => ["assignments", id, "submissions"] as const,
    mySubmissions: (id: number) => ["assignments", id, "my-submissions"] as const,
    attemptReview: (id: number, attemptId: number) => ["assignments", id, "quiz-attempts", attemptId] as const,
    results: (id: number) => ["assignments", id, "results"] as const,
  },
  submissions: {
    detail: (id: number) => ["submission", id] as const,
  },
  admin: {
    settings: ["admin", "settings"] as const,
    publicSettings: ["settings", "public"] as const,
    stats: (days: number) => ["admin", "stats", days] as const,
    realtime: ["admin", "realtime"] as const,
    queues: ["health", "queue"] as const,
    failed: (page: number) => ["admin", "grading", "failed", page] as const,
    announcements: (page: number) => ["admin", "announcements", page] as const,
    userSessions: (userId: number) => ["admin", "users", userId, "sessions"] as const,
  },
  exams: {
    papers: (assignmentId: number) => ["assignments", assignmentId, "papers"] as const,
    monitor: (assignmentId: number) => ["assignments", assignmentId, "monitor"] as const,
    mySessions: (assignmentId: number) => ["assignments", assignmentId, "my-sessions"] as const,
    session: (sessionId: number) => ["attempt-sessions", sessionId] as const,
    events: (sessionId: number) => ["attempt-sessions", sessionId, "events"] as const,
  },
  schedule: {
    sessions: (classId: string) => ["classes", classId, "sessions"] as const,
    attendance: (sessionId: number) => ["sessions", sessionId, "attendance"] as const,
    summary: (classId: string) => ["classes", classId, "attendance-summary"] as const,
    leaveRequests: (classId: string, status?: string) => ["classes", classId, "leave-requests", status] as const,
  },
  grades: {
    policy: (classId: string) => ["classes", classId, "grade-policy"] as const,
    gradebook: (classId: string) => ["classes", classId, "gradebook"] as const,
    mine: (classId: string) => ["me", "classes", classId, "grades"] as const,
  },
  classes: {
    all: ["classes"] as const,
    list: (filters: { course_id?: string; semester?: string; page?: number; limit?: number; q?: string; sort?: string }) =>
      ["classes", "list", filters] as const,
    detail: (id: string) => ["classes", "detail", id] as const,
    students: (id: string, filters?: { q?: string; sort?: string; page?: number; limit?: number }) => ["classes", "students", id, filters] as const,
    candidates: (id: string, filters?: { q?: string; page?: number; limit?: number }) => ["classes", "student-candidates", id, filters] as const,
  },
  materials: {
    list: (classId: string) => ["classes", classId, "materials"] as const,
  },
  notifications: {
    list: () => ["notifications", "list"] as const,
  },
  me: {
    classes: (filters?: { q?: string; sort?: string; page?: number; limit?: number }) => ["me", "classes", filters] as const,
  },
} as const;
