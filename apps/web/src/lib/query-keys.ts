/** Chuẩn hoá cache keys cho TanStack Query */

export const queryKeys = {
  users: {
    all: ["users"] as const,
    list: (filters: { page: number; limit: number; role?: string; status?: string }) =>
      ["users", "list", filters] as const,
  },
  audit: { list: (filters: Record<string, string | number | undefined>) => ["audit", "list", filters] as const },
  courses: {
    all: ["courses"] as const,
    list: () => ["courses", "list"] as const,
    detail: (id: string) => ["courses", "detail", id] as const,
  },
  classes: {
    all: ["classes"] as const,
    list: (filters: { course_id?: string; page?: number; limit?: number }) =>
      ["classes", "list", filters] as const,
    detail: (id: string) => ["classes", "detail", id] as const,
    students: (id: string) => ["classes", "students", id] as const,
  },
  materials: {
    list: (classId: string) => ["classes", classId, "materials"] as const,
  },
  notifications: {
    list: () => ["notifications", "list"] as const,
  },
  me: {
    classes: () => ["me", "classes"] as const,
    schedule: (from: string, to: string) => ["me", "schedule", from, to] as const,
  },
} as const;
