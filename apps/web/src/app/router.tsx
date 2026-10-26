import { Navigate, Outlet, Route, Routes, useParams } from "react-router-dom";
import RootPage from "@/app/page";
import { LoginPage } from "@/features/auth/login-page";
import { UsersPage } from "@/features/users/users-page";
import { CoursesPage } from "@/features/courses/courses-page";
import { AdminAcademicsPage } from "@/features/courses/admin-academics-page";
import { CourseClassesPage } from "@/features/classes/course-classes-page";
import { ClassDetailPage } from "@/features/classes/class-detail-page";
import { MyClassesPage } from "@/features/me/my-classes-page";
import { MyClassMaterialsPage } from "@/features/me/my-class-materials-page";
import { AuditLogsPage } from "@/features/audit/audit-logs-page";
import { ProfilePage } from "@/features/users/profile-page";
import { QuestionsPage } from "@/features/questions/questions-page";
import { QuestionEditorPage } from "@/features/questions/question-editor-page";
import { AssignmentEditorPage } from "@/features/assignments/assignment-editor-page";
import { AssignmentResultsPage } from "@/features/assignments/assignment-results-page";
import { SubmissionDetailPage } from "@/features/assignments/submission-detail-page";
import { StudentAssignmentPage } from "@/features/assignments/student-assignment-page";
import { QuizAttemptPage } from "@/features/assignments/quiz-attempt-page";
import { AttemptReviewPage } from "@/features/assignments/attempt-review-page";
import { ProblemWorkspacePage } from "@/features/assignments/problem-workspace-page";
import { AppShell } from "@/components/app-shell";
import { useAuthGuard } from "@/hooks/use-auth-guard";

function ProtectedLayout() {
  const { status } = useAuthGuard();
  if (status === "checking") return <div className="grid min-h-dvh place-items-center">Đang kiểm tra phiên đăng nhập…</div>;
  if (status === "denied") return <div className="grid min-h-dvh place-items-center">Không có quyền truy cập.</div>;
  return <AppShell><Outlet /></AppShell>;
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
