import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssignmentsSection } from "@/features/assignments/assignments-section";
import { MaterialsSection } from "@/features/materials/materials-section";
import { ClassWorkspaceHeader } from "@/features/classes/class-workspace-header";
import { ClassOverviewTab } from "@/features/classes/class-overview-tab";
import { useTabParam } from "@/features/classes/use-tab-param";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useMyClasses } from "./use-my-classes";

const TABS = ["overview", "materials", "assignments"] as const;

/**
 * Workspace lớp của sinh viên (/me/classes/:id) — header lớp + tab Tổng quan / Học liệu / Bài tập.
 * Thông tin lớp lấy từ danh sách lớp đã ghi danh (dùng chung cache với trang chủ).
 */
export function MyClassMaterialsPage({ classId }: { classId: string }) {
  const { status: guard } = useAuthGuard(["student"]);
  const [tab, setTab] = useTabParam(TABS, "overview");
  const classesQuery = useMyClasses(guard === "ok");

  if (guard !== "ok") return null;
  const clazz = classesQuery.data?.find((c) => String(c.id) === classId);

  return (
    <div className="space-y-6">
      <ClassWorkspaceHeader clazz={clazz} loading={classesQuery.isPending} showCapacity={false} />
      <Tabs value={tab} onValueChange={setTab} className="gap-5">
        <TabsList variant="line" aria-label="Khu vực của lớp">
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="materials">Học liệu</TabsTrigger>
          <TabsTrigger value="assignments">Bài tập</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <ClassOverviewTab
            classId={classId}
            onOpenTab={setTab}
            assignmentHref={(item) => `/me/classes/${classId}/assignments/${item.id}`}
          />
        </TabsContent>
        <TabsContent value="materials">
          <MaterialsSection classId={classId} canManage={false} />
        </TabsContent>
        <TabsContent value="assignments">
          <AssignmentsSection classId={classId} canManage={false} canTake />
        </TabsContent>
      </Tabs>
    </div>
  );
}
