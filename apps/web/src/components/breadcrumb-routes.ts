import { matchPath } from "react-router-dom";

/** Một mục breadcrumb; mục cuối (trang hiện tại) không có href. */
export interface Crumb { label: string; href?: string }

type Params = Record<string, string | undefined>;
interface RouteCrumbs { pattern: string; build: (p: Params, ctx: { isAdmin: boolean }) => Crumb[] }

/** Gốc khu "lớp" của giảng viên/quản trị. */
const teachRoot = (isAdmin: boolean): Crumb =>
  isAdmin ? { label: "Học phần & lớp", href: "/admin/academics" } : { label: "Lớp phụ trách", href: "/courses" };
const teachClass = (id: string | undefined, tab?: string): Crumb =>
  ({ label: "Lớp học", href: `/classes/${id}${tab ? `?tab=${tab}` : ""}` });
const myClasses: Crumb = { label: "Lớp của tôi", href: "/me/classes" };
const myClass = (id: string | undefined, tab?: string): Crumb =>
  ({ label: "Lớp học", href: `/me/classes/${id}${tab ? `?tab=${tab}` : ""}` });
const myAssignment = (p: Params): Crumb =>
  ({ label: "Bài tập", href: `/me/classes/${p.classId}/assignments/${p.assignmentId}` });
const questions: Crumb = { label: "Ngân hàng câu hỏi", href: "/questions" };

/**
 * Bảng route → nhãn tiếng Việt. Route có tham số hiển thị nhãn chung ("Lớp học", "Bài tập"…).
 * Thứ tự: route cụ thể trước route tổng quát.
 */
const ROUTES: RouteCrumbs[] = [
  { pattern: "/admin/users", build: () => [{ label: "Quản trị" }, { label: "Người dùng" }] },
  { pattern: "/admin/academics", build: () => [{ label: "Quản trị" }, { label: "Học phần & lớp" }] },
  { pattern: "/admin/audit-logs", build: () => [{ label: "Quản trị" }, { label: "Nhật ký kiểm toán" }] },
  { pattern: "/me/profile", build: () => [{ label: "Hồ sơ của tôi" }] },
  { pattern: "/courses", build: () => [{ label: "Lớp phụ trách" }] },
  { pattern: "/courses/:id", build: (_, c) => [teachRoot(c.isAdmin), { label: "Học phần" }] },
  { pattern: "/questions", build: () => [{ label: "Ngân hàng câu hỏi" }] },
  { pattern: "/questions/new", build: () => [questions, { label: "Câu hỏi mới" }] },
  { pattern: "/questions/:questionId/edit", build: () => [questions, { label: "Sửa câu hỏi" }] },
  { pattern: "/classes/:id", build: (_, c) => [teachRoot(c.isAdmin), { label: "Lớp học" }] },
  { pattern: "/classes/:classId/assignments/new",
    build: (p, c) => [teachRoot(c.isAdmin), teachClass(p.classId, "assignments"), { label: "Bài tập mới" }] },
  { pattern: "/classes/:classId/assignments/:assignmentId/edit",
    build: (p, c) => [teachRoot(c.isAdmin), teachClass(p.classId, "assignments"), { label: "Sửa bài tập" }] },
  { pattern: "/classes/:classId/assignments/:assignmentId/results",
    build: (p, c) => [teachRoot(c.isAdmin), teachClass(p.classId, "assignments"), { label: "Kết quả bài tập" }] },
  { pattern: "/submissions/:submissionId", build: () => [{ label: "Chi tiết bài nộp" }] },
  { pattern: "/me/classes", build: () => [{ label: "Lớp của tôi" }] },
  { pattern: "/me/classes/:id", build: () => [myClasses, { label: "Lớp học" }] },
  { pattern: "/me/classes/:classId/assignments/:assignmentId",
    build: (p) => [myClasses, myClass(p.classId, "assignments"), { label: "Bài tập" }] },
  { pattern: "/me/classes/:classId/assignments/:assignmentId/attempt",
    build: (p) => [myClasses, myClass(p.classId, "assignments"), myAssignment(p), { label: "Làm bài" }] },
  { pattern: "/me/classes/:classId/assignments/:assignmentId/attempts/:attemptId",
    build: (p) => [myClasses, myClass(p.classId, "assignments"), myAssignment(p), { label: "Xem lại lượt làm" }] },
  { pattern: "/me/classes/:classId/assignments/:assignmentId/problems/:questionId",
    build: (p) => [myClasses, myClass(p.classId, "assignments"), myAssignment(p), { label: "Bài lập trình" }] },
];

export function crumbsFor(pathname: string, isAdmin: boolean): Crumb[] {
  for (const route of ROUTES) {
    const match = matchPath({ path: route.pattern, end: true }, pathname);
    if (match) return route.build(match.params, { isAdmin });
  }
  return [];
}

/**
 * Trang làm việc tràn rộng (editor, workspace code, làm quiz, bảng kết quả): AppShell bỏ giới hạn
 * `max-w-6xl`. Trang khác có thể tự xin tràn rộng bằng `data-layout="wide"` trên phần tử gốc.
 */
const WIDE_PATTERNS = [
  "/questions/new",
  "/questions/:questionId/edit",
  "/classes/:classId/assignments/new",
  "/classes/:classId/assignments/:assignmentId/edit",
  "/classes/:classId/assignments/:assignmentId/results",
  "/me/classes/:classId/assignments/:assignmentId/attempt",
  "/me/classes/:classId/assignments/:assignmentId/problems/:questionId",
];

export function isWideRoute(pathname: string): boolean {
  return WIDE_PATTERNS.some((pattern) => matchPath({ path: pattern, end: true }, pathname) != null);
}
