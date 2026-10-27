import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorState } from "@/components/state-blocks";
import { MaterialsSection } from "@/features/materials/materials-section";
import { UploadMaterialDialog } from "@/features/materials/upload-material-dialog";
import { AssignmentsSection } from "@/features/assignments/assignments-section";
import { ClassWorkspaceHeader } from "@/features/classes/class-workspace-header";
import { ClassOverviewTab } from "@/features/classes/class-overview-tab";
import { ClassStudentsTab } from "@/features/classes/class-students-tab";
import { useTabParam } from "@/features/classes/use-tab-param";
import { ScheduleTab } from "@/features/schedule/lecturer/schedule-tab";
import { LeaveRequestsTab } from "@/features/schedule/lecturer/leave-requests-tab";
import { usePendingLeaveCount } from "@/features/schedule/lecturer/use-leave-requests";
import { GradebookTab } from "@/features/grades/lecturer/gradebook-tab";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { hasRole } from "@/stores/auth";
import { ExamsSection } from "@/features/exams/exams-section";
import type { ClassSummary } from "@/types/api";

const TABS = ["overview", "schedule", "materials", "assignments", "exams", "students", "leave", "grades"] as const;

/** Trang lớp của giảng viên/quản trị (DESIGN.md §4): đầu trang + hành động phải, tab gạch chân lưu ở `?tab=`. */
export function ClassDetailPage({ classId }: { classId: string }) {
  const { status: guard, user } = useAuthGuard(["admin", "lecturer"]);
  const [tab, setTab] = useTabParam(TABS, "overview");
  const [uploadOpen, setUploadOpen] = useState(false);
  const canManage = hasRole(user, "lecturer");
  const pendingLeaves = usePendingLeaveCount(classId, guard === "ok");

  const classQuery = useQuery({
    queryKey: queryKeys.classes.detail(classId),
    queryFn: ({ signal }) => api.get<ClassSummary>(`/classes/${classId}`, undefined, signal),
    enabled: guard === "ok",
  });

  if (guard !== "ok") return null;

  // Lối tắt chỉ ở Tổng quan — các tab khác đã có nút chính riêng (mỗi vùng tối đa một nút đỏ).
  const actions = canManage && tab === "overview" ? (
    <>
      <Button variant="outline" onClick={() => setUploadOpen(true)}><Upload aria-hidden /> Tải học liệu</Button>
      <Button asChild><Link to={`/classes/${classId}/assignments/new`}><Plus aria-hidden /> Tạo bài tập</Link></Button>
    </>
  ) : undefined;

  return (
    // Bảng nghiệp vụ (lịch học, đơn, sổ điểm) cần rộng hơn khung mặc định 5xl — giới hạn ở 6xl.
    <div data-layout="wide" className="mx-auto w-full max-w-6xl space-y-6">
      {classQuery.isError ? (
        <ErrorState error={classQuery.error} onRetry={() => classQuery.refetch()} />
      ) : (
        <ClassWorkspaceHeader clazz={classQuery.data} loading={classQuery.isPending} showLecturer actions={actions} />
      )}

      <Tabs value={tab} onValueChange={setTab} className="gap-6">
        <TabsList variant="line" aria-label="Khu vực của lớp">
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="schedule">Lịch học</TabsTrigger>
          <TabsTrigger value="materials">Học liệu</TabsTrigger>
          <TabsTrigger value="assignments">Bài tập</TabsTrigger>
          <TabsTrigger value="exams">Kỳ thi</TabsTrigger>
          <TabsTrigger value="students">Sinh viên</TabsTrigger>
          <TabsTrigger value="leave">
            Đơn xin nghỉ
            {pendingLeaves ? <Badge variant="destructive" className="h-4 min-w-4 px-1 tabular-nums" aria-label={`${pendingLeaves} đơn chờ duyệt`}>{pendingLeaves}</Badge> : null}
          </TabsTrigger>
          <TabsTrigger value="grades">Kết quả học tập</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <ClassOverviewTab
            classId={classId}
            clazz={classQuery.data}
            canManage={canManage}
            summary
            onOpenTab={setTab}
            assignmentHref={(item) => `/classes/${classId}/assignments/${item.id}/results`}
          />
        </TabsContent>
        <TabsContent value="schedule">
          <ScheduleTab classId={classId} clazz={classQuery.data} />
        </TabsContent>
        <TabsContent value="materials">
          <MaterialsSection classId={classId} canManage={canManage} />
        </TabsContent>
        <TabsContent value="assignments">
          <AssignmentsSection classId={classId} canManage={canManage} />
        </TabsContent>
        <TabsContent value="exams">
          <ExamsSection classId={classId} canManage={canManage} />
        </TabsContent>
        <TabsContent value="students">
          <ClassStudentsTab classId={classId} />
        </TabsContent>
        <TabsContent value="leave">
          <LeaveRequestsTab classId={classId} />
        </TabsContent>
        <TabsContent value="grades">
          <GradebookTab classId={classId} clazz={classQuery.data} />
        </TabsContent>
      </Tabs>
      {uploadOpen ? <UploadMaterialDialog classId={classId} onOpenChange={setUploadOpen} /> : null}
    </div>
  );
}
