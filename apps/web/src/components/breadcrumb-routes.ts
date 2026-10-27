import { matchPath } from "react-router-dom";

/** Một mục breadcrumb; mục cuối (trang hiện tại) không có href. */
export interface Crumb { label: string; href?: string }

type Params = Record<string, string | undefined>;
/** Tên thật lấy từ cache dữ liệu (rỗng khi chưa tải xong → dùng nhãn chung). */
export interface CrumbNames { className?: string; assignmentTitle?: string }
interface Ctx { isAdmin: boolean; names: CrumbNames }
interface RouteCrumbs { pattern: string; build: (p: Params, ctx: Ctx) => Crumb[] }

const teachRoot = ({ isAdmin }: Ctx): Crumb =>
  isAdmin ? { label: "Học phần & lớp", href: "/admin/academics" } : { label: "Lớp phụ trách", href: "/courses" };
const teachClass = (id: string | undefined, ctx: Ctx): Crumb =>
  ({ label: ctx.names.className ?? "Lớp học", href: `/classes/${id}?tab=assignments` });
const myClasses: Crumb = { label: "Lớp của tôi", href: "/me/classes" };
const myClass = (id: string | undefined, ctx: Ctx): Crumb =>
  ({ label: ctx.names.className ?? "Lớp học", href: `/me/classes/${id}?tab=assignments` });
const myAssignment = (p: Params, ctx: Ctx): Crumb =>
  ({ label: ctx.names.assignmentTitle ?? "Bài tập", href: `/me/classes/${p.classId}/assignments/${p.assignmentId}` });
const assignmentLabel = (ctx: Ctx, fallback: string) => ctx.names.assignmentTitle ?? fallback;
const questions: Crumb = { label: "Ngân hàng câu hỏi", href: "/questions" };

/** Bảng route → breadcrumb; route cụ thể trước route tổng quát. */
const ROUTES: RouteCrumbs[] = [
  { pattern: "/admin/users", build: () => [{ label: "Quản trị" }, { label: "Người dùng" }] },
  { pattern: "/admin/academics", build: () => [{ label: "Quản trị" }, { label: "Học phần & lớp" }] },
  { pattern: "/admin/audit-logs", build: () => [{ label: "Quản trị" }, { label: "Nhật ký kiểm toán" }] },
  { pattern: "/me/profile", build: () => [{ label: "Hồ sơ của tôi" }] },
  { pattern: "/courses", build: () => [{ label: "Lớp phụ trách" }] },
  { pattern: "/courses/:id", build: (_, c) => [teachRoot(c), { label: "Học phần" }] },
  { pattern: "/questions", build: () => [{ label: "Ngân hàng câu hỏi" }] },
  { pattern: "/questions/new", build: () => [questions, { label: "Câu hỏi mới" }] },
  { pattern: "/questions/:questionId/edit", build: (p) => [questions, { label: `Câu hỏi #${p.questionId}` }] },
  { pattern: "/classes/:id", build: (_, c) => [teachRoot(c), { label: c.names.className ?? "Lớp học" }] },
  { pattern: "/classes/:classId/assignments/new", build: (p, c) => [teachRoot(c), teachClass(p.classId, c), { label: "Tạo mới" }] },
  { pattern: "/classes/:classId/assignments/:assignmentId/edit",
    build: (p, c) => [teachRoot(c), teachClass(p.classId, c), { label: assignmentLabel(c, "Sửa bài tập") }] },
  { pattern: "/classes/:classId/assignments/:assignmentId/papers",
    build: (p, c) => [teachRoot(c), teachClass(p.classId, c), { label: assignmentLabel(c, "Kỳ thi"), href: `/classes/${p.classId}/assignments/${p.assignmentId}/edit` }, { label: "Xem trước đề" }] },
  { pattern: "/classes/:classId/assignments/:assignmentId/monitor",
    build: (p, c) => [teachRoot(c), teachClass(p.classId, c), { label: assignmentLabel(c, "Kỳ thi"), href: `/classes/${p.classId}/assignments/${p.assignmentId}/results` }, { label: "Giám sát" }] },
  { pattern: "/classes/:classId/assignments/:assignmentId/results",
    build: (p, c) => [teachRoot(c), teachClass(p.classId, c), { label: assignmentLabel(c, "Kết quả bài tập") }] },
  { pattern: "/submissions/:submissionId", build: (p) => [{ label: `Bài nộp #${p.submissionId}` }] },
  { pattern: "/classes/:classId/sessions/:sessionId",
    build: (p, c) => [teachRoot(c), { label: c.names.className ?? "Lớp học", href: `/classes/${p.classId}?tab=schedule` }, { label: "Điểm danh" }] },
  { pattern: "/me/classes", build: () => [{ label: "Lớp của tôi" }] },
  { pattern: "/me/classes/:id", build: (_, c) => [myClasses, { label: c.names.className ?? "Lớp học" }] },
  { pattern: "/me/classes/:classId/assignments/:assignmentId",
    build: (p, c) => [myClasses, myClass(p.classId, c), { label: assignmentLabel(c, "Bài tập") }] },
  { pattern: "/me/classes/:classId/assignments/:assignmentId/attempt",
    build: (p, c) => [myClasses, myClass(p.classId, c), myAssignment(p, c), { label: "Làm bài" }] },
  { pattern: "/me/classes/:classId/assignments/:assignmentId/attempts/:attemptId",
    build: (p, c) => [myClasses, myClass(p.classId, c), myAssignment(p, c), { label: "Kết quả lượt làm" }] },
  { pattern: "/me/classes/:classId/assignments/:assignmentId/problems/:questionId",
    build: (p, c) => [myClasses, myClass(p.classId, c), myAssignment(p, c), { label: "Bài lập trình" }] },
];

/** Tham số route hiện tại (để tra tên lớp/bài) — dùng chung với `crumbsFor`. */
export function routeParams(pathname: string): Params {
  for (const route of ROUTES) {
    const match = matchPath({ path: route.pattern, end: true }, pathname);
    if (match) return { ...match.params, classId: match.params.classId ?? match.params.id };
  }
  return {};
}

export function crumbsFor(pathname: string, isAdmin: boolean, names: CrumbNames = {}): Crumb[] {
  for (const route of ROUTES) {
    const match = matchPath({ path: route.pattern, end: true }, pathname);
    if (match) return route.build(match.params, { isAdmin, names });
  }
  return [];
}

/**
 * Trang làm việc tràn rộng (editor, workspace code, làm quiz, bảng kết quả): AppShell bỏ giới hạn
 * `max-w-5xl`. Trang khác có thể tự xin tràn rộng bằng `data-layout="wide"` trên phần tử gốc.
 */
const WIDE_PATTERNS = [
  "/questions/new",
  "/questions/:questionId/edit",
  "/classes/:classId/assignments/new",
  "/classes/:classId/assignments/:assignmentId/edit",
  "/classes/:classId/assignments/:assignmentId/results",
  "/classes/:classId/assignments/:assignmentId/papers",
  "/classes/:classId/assignments/:assignmentId/monitor",
  "/me/classes/:classId/assignments/:assignmentId/attempt",
  "/me/classes/:classId/assignments/:assignmentId/problems/:questionId",
];

export function isWideRoute(pathname: string): boolean {
  return WIDE_PATTERNS.some((pattern) => matchPath({ path: pattern, end: true }, pathname) != null);
}
