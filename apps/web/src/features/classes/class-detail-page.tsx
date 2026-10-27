import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, Upload } from "lucide-react";
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
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { hasRole } from "@/stores/auth";
import type { ClassSummary } from "@/types/api";

const TABS = ["overview", "materials", "assignments", "students"] as const;

/** Trang lớp của giảng viên/quản trị (DESIGN.md §4): đầu trang + hành động phải, tab gạch chân lưu ở `?tab=`. */
export function ClassDetailPage({ classId }: { classId: string }) {
  const { status: guard, user } = useAuthGuard(["admin", "lecturer"]);
  const [tab, setTab] = useTabParam(TABS, "overview");
  const [uploadOpen, setUploadOpen] = useState(false);
  const canManage = hasRole(user, "lecturer");

  const classQuery = useQuery({
    queryKey: queryKeys.classes.detail(classId),
    queryFn: ({ signal }) => api.get<ClassSummary>(`/classes/${classId}`, undefined, signal),
    enabled: guard === "ok",
  });

  if (guard !== "ok") return null;

  // Tab Học liệu / Bài tập đã có nút tạo riêng — ẩn nút trùng ở đầu trang để mỗi vùng chỉ một hành động chính.
  const actions = canManage ? (
    <>
      {tab !== "materials" ? <Button variant="outline" onClick={() => setUploadOpen(true)}><Upload aria-hidden /> Tải học liệu</Button> : null}
      {tab !== "assignments" ? <Button asChild><Link to={`/classes/${classId}/assignments/new`}><Plus aria-hidden /> Tạo bài tập</Link></Button> : null}
    </>
  ) : undefined;

  return (
    <div className="space-y-6">
      {classQuery.isError ? (
        <ErrorState error={classQuery.error} onRetry={() => classQuery.refetch()} />
      ) : (
        <ClassWorkspaceHeader clazz={classQuery.data} loading={classQuery.isPending} showLecturer={!canManage} actions={actions} />
      )}

      <Tabs value={tab} onValueChange={setTab} className="gap-6">
        <TabsList variant="line" aria-label="Khu vực của lớp">
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="materials">Học liệu</TabsTrigger>
          <TabsTrigger value="assignments">Bài tập</TabsTrigger>
          <TabsTrigger value="students">Sinh viên</TabsTrigger>
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
        <TabsContent value="materials">
          <MaterialsSection classId={classId} canManage={canManage} />
        </TabsContent>
        <TabsContent value="assignments">
          <AssignmentsSection classId={classId} canManage={canManage} />
        </TabsContent>
        <TabsContent value="students">
          <ClassStudentsTab classId={classId} />
        </TabsContent>
      </Tabs>
      {uploadOpen ? <UploadMaterialDialog classId={classId} onOpenChange={setUploadOpen} /> : null}
    </div>
  );
}
