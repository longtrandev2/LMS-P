import { lazy, Suspense, type ComponentType } from "react";
import { Link, Navigate, Outlet, Route, Routes, useParams } from "react-router-dom";
import { ShieldOff } from "lucide-react";
import RootPage from "@/app/page";
import { LoginPage } from "@/features/auth/login-page";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState, ListSkeleton } from "@/components/state-blocks";
import { useAuthGuard } from "@/hooks/use-auth-guard";

/** Tách mỗi trang thành chunk riêng — editor code, Markdown, zip chỉ tải khi mở trang cần. */
function page<T extends Record<string, ComponentType<never>>>(load: () => Promise<T>, name: keyof T) {
  return lazy(async () => ({ default: (await load())[name] as ComponentType<Record<string, never>> }));
}

const UsersPage = page(() => import("@/features/users/users-page"), "UsersPage");
const CoursesPage = page(() => import("@/features/courses/courses-page"), "CoursesPage");
const AdminAcademicsPage = page(() => import("@/features/courses/admin-academics-page"), "AdminAcademicsPage");
const AuditLogsPage = page(() => import("@/features/audit/audit-logs-page"), "AuditLogsPage");
const ProfilePage = page(() => import("@/features/users/profile-page"), "ProfilePage");
const MyClassesPage = page(() => import("@/features/me/my-classes-page"), "MyClassesPage");
const QuestionsPage = page(() => import("@/features/questions/questions-page"), "QuestionsPage");
const QuestionEditorPage = page(() => import("@/features/questions/question-editor-page"), "QuestionEditorPage");
const AssignmentEditorPage = page(() => import("@/features/assignments/assignment-editor-page"), "AssignmentEditorPage");
const AssignmentResultsPage = page(() => import("@/features/assignments/assignment-results-page"), "AssignmentResultsPage");
const SubmissionDetailPage = page(() => import("@/features/assignments/submission-detail-page"), "SubmissionDetailPage");
const StudentAssignmentPage = page(() => import("@/features/assignments/student-assignment-page"), "StudentAssignmentPage");
const QuizAttemptPage = page(() => import("@/features/assignments/quiz-attempt-page"), "QuizAttemptPage");
const AttemptReviewPage = page(() => import("@/features/assignments/attempt-review-page"), "AttemptReviewPage");
const ProblemWorkspacePage = page(() => import("@/features/assignments/problem-workspace-page"), "ProblemWorkspacePage");
const SessionAttendancePage = page(() => import("@/features/schedule/lecturer/session-attendance-page"), "SessionAttendancePage");
const CourseClassesPage = lazy(async () => ({ default: (await import("@/features/classes/course-classes-page")).CourseClassesPage }));
const ClassDetailPage = lazy(async () => ({ default: (await import("@/features/classes/class-detail-page")).ClassDetailPage }));
const MyClassMaterialsPage = lazy(async () => ({ default: (await import("@/features/me/my-class-materials-page")).MyClassMaterialsPage }));

function ProtectedLayout() {
  const { status } = useAuthGuard();
  if (status === "checking") return <div className="grid min-h-dvh place-items-center bg-background">
    <p role="status" className="text-sm text-muted-foreground">Đang kiểm tra phiên đăng nhập…</p>
  </div>;
  if (status === "denied") return <div className="grid min-h-dvh place-items-center bg-background p-4">
    <EmptyState icon={ShieldOff} title="Không có quyền truy cập" description="Tài khoản của bạn không được mở trang này."
      action={<Button asChild variant="outline"><Link to="/">Về trang chủ</Link></Button>} />
  </div>;
  return <AppShell>
    <Suspense fallback={<div role="status" aria-label="Đang tải trang" className="py-2"><ListSkeleton /></div>}><Outlet /></Suspense>
  </AppShell>;
}
function CourseRoute() { const { id = "" } = useParams(); return <CourseClassesPage courseId={id} />; }
function ClassRoute() { const { id = "" } = useParams(); return <ClassDetailPage classId={id} />; }
function MyClassRoute() { const { id = "" } = useParams(); return <MyClassMaterialsPage classId={id} />; }

export function AppRouter() {
  return <Routes>
    <Route path="/" element={<RootPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route element={<ProtectedLayout />}>
      <Route path="/admin/users" element={<UsersPage />} />
      <Route path="/admin/academics" element={<AdminAcademicsPage />} />
      <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
      <Route path="/me/profile" element={<ProfilePage />} />
      <Route path="/courses" element={<CoursesPage />} />
      <Route path="/questions" element={<QuestionsPage />} />
      <Route path="/questions/new" element={<QuestionEditorPage />} />
      <Route path="/questions/:questionId/edit" element={<QuestionEditorPage />} />
      <Route path="/classes/:classId/assignments/new" element={<AssignmentEditorPage />} />
      <Route path="/classes/:classId/assignments/:assignmentId/edit" element={<AssignmentEditorPage />} />
      <Route path="/classes/:classId/assignments/:assignmentId/results" element={<AssignmentResultsPage />} />
      <Route path="/submissions/:submissionId" element={<SubmissionDetailPage />} />
      <Route path="/classes/:classId/sessions/:sessionId" element={<SessionAttendancePage />} />
      <Route path="/me/classes/:classId/assignments/:assignmentId" element={<StudentAssignmentPage />} />
      <Route path="/me/classes/:classId/assignments/:assignmentId/attempt" element={<QuizAttemptPage />} />
      <Route path="/me/classes/:classId/assignments/:assignmentId/attempts/:attemptId" element={<AttemptReviewPage />} />
      <Route path="/me/classes/:classId/assignments/:assignmentId/problems/:questionId" element={<ProblemWorkspacePage />} />
      <Route path="/courses/:id" element={<CourseRoute />} />
      <Route path="/classes/:id" element={<ClassRoute />} />
      <Route path="/me/classes" element={<MyClassesPage />} />
      <Route path="/me/classes/:id" element={<MyClassRoute />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
