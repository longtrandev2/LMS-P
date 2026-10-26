import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorState } from "@/components/state-blocks";
import { MaterialsSection } from "@/features/materials/materials-section";
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

/** Workspace lớp của giảng viên/quản trị (DESIGN.md §5): header lớp + tab ngang lưu ở `?tab=`. */
export function ClassDetailPage({ classId }: { classId: string }) {
  const { status: guard, user } = useAuthGuard(["admin", "lecturer"]);
  const [tab, setTab] = useTabParam(TABS, "overview");
  const canManage = hasRole(user, "lecturer");

  const classQuery = useQuery({
    queryKey: queryKeys.classes.detail(classId),
    queryFn: ({ signal }) => api.get<ClassSummary>(`/classes/${classId}`, undefined, signal),
    enabled: guard === "ok",
  });

  if (guard !== "ok") return null;

  return (
    <div className="space-y-6">
      {classQuery.isError ? (
        <div className="rounded-xl border bg-card"><ErrorState error={classQuery.error} onRetry={() => classQuery.refetch()} /></div>
      ) : (
        <ClassWorkspaceHeader clazz={classQuery.data} loading={classQuery.isPending} />
      )}

      <Tabs value={tab} onValueChange={setTab} className="gap-5">
        <TabsList variant="line" aria-label="Khu vực của lớp">
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="materials">Học liệu</TabsTrigger>
          <TabsTrigger value="assignments">Bài tập</TabsTrigger>
          <TabsTrigger value="students">Sinh viên</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <ClassOverviewTab
            classId={classId}
            canManage={canManage}
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
    </div>
  );
}
