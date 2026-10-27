import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssignmentsSection } from "@/features/assignments/assignments-section";
import { MaterialsSection } from "@/features/materials/materials-section";
import { ClassWorkspaceHeader } from "@/features/classes/class-workspace-header";
import { ClassOverviewTab } from "@/features/classes/class-overview-tab";
import { useTabParam } from "@/features/classes/use-tab-param";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { ClassProgressAside } from "./class-progress-aside";
import { useClassProgress } from "./use-class-progress";
import { useMyClasses } from "./use-my-classes";

const TABS = ["overview", "materials", "assignments"] as const;

/**
 * Trang lớp của sinh viên (/me/classes/:id) — kiểu trang khóa học Frappe (DESIGN.md §4): cột chính
 * (đầu trang + tab Tổng quan / Học liệu / Bài tập) và cột phải 320px nền sidebar với tiến độ + danh sách bài.
 * Màn hẹp: cột phải xuống dưới. Thông tin lớp lấy từ danh sách lớp đã ghi danh (dùng chung cache trang chủ).
 */
export function MyClassMaterialsPage({ classId }: { classId: string }) {
  const { status: guard } = useAuthGuard(["student"]);
  const [tab, setTab] = useTabParam(TABS, "overview");
  const classesQuery = useMyClasses(guard === "ok");
  const progress = useClassProgress(classId, guard === "ok");

  if (guard !== "ok") return null;
  const clazz = classesQuery.data?.find((c) => String(c.id) === classId);

  return (
    <div data-layout="full" className="lg:grid lg:min-h-[calc(100dvh-3rem)] lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <ClassWorkspaceHeader clazz={clazz} loading={classesQuery.isPending} showCapacity={false} showLecturer />
          <Tabs value={tab} onValueChange={setTab} className="gap-6">
            <TabsList variant="line" aria-label="Khu vực của lớp">
              <TabsTrigger value="overview">Tổng quan</TabsTrigger>
              <TabsTrigger value="materials">Học liệu</TabsTrigger>
              <TabsTrigger value="assignments">Bài tập</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <ClassOverviewTab
                classId={classId}
                clazz={clazz}
                submittedIds={progress.submittedIds}
                onOpenTab={(next) => setTab(next)}
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
      </div>
      <ClassProgressAside classId={classId} clazz={clazz} progress={progress} />
    </div>
  );
}
