import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssignmentsSection } from "@/features/assignments/assignments-section";
import { useTabParam } from "@/features/classes/use-tab-param";
import { StudentGradesTab } from "@/features/grades/student/student-grades-tab";
import { StudentScheduleTab } from "@/features/schedule/student/student-schedule-tab";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { cn } from "@/lib/utils";
import { ClassProgressAside } from "./class-progress-aside";
import { StudentClassHeader } from "./student-class-header";
import { StudentOverviewTab } from "./student-overview-tab";
import { useClassProgress } from "./use-class-progress";
import { useMyClasses } from "./use-my-classes";

const TABS = ["overview", "schedule", "assignments", "grades"] as const;

/**
 * Trang lớp của sinh viên (/me/classes/:id) — DESIGN.md v3.1 §4: tiêu đề lớp đỏ + khung thông tin lớp,
 * tab gạch chân Thông tin chung / Lịch học / Bài tập / Kết quả học tập (lưu `?tab=`).
 * Tab Thông tin chung giữ cột tiến độ 320px bên phải; Lịch học và Kết quả học tập dùng cả chiều ngang cho bảng.
 */
export function MyClassMaterialsPage({ classId }: { classId: string }) {
  const { status: guard } = useAuthGuard(["student"]);
  const [tab, setTab] = useTabParam(TABS, "overview");
  const classesQuery = useMyClasses(guard === "ok");
  const progress = useClassProgress(classId, guard === "ok");

  if (guard !== "ok") return null;
  const clazz = classesQuery.data?.find((c) => String(c.id) === classId);
  const withAside = tab === "overview";

  return (
    <div data-layout="full" className={cn(withAside && "lg:grid lg:min-h-[calc(100dvh-3rem)] lg:grid-cols-[minmax(0,1fr)_320px]")}>
      <div className="min-w-0 px-4 py-6 sm:px-8 sm:py-8">
        <div className={cn("mx-auto space-y-6", withAside ? "max-w-4xl" : "max-w-6xl")}>
          <StudentClassHeader clazz={clazz} loading={classesQuery.isPending} />
          <Tabs value={tab} onValueChange={setTab} className="gap-6">
            <TabsList variant="line" aria-label="Khu vực của lớp">
              <TabsTrigger value="overview">Thông tin chung</TabsTrigger>
              <TabsTrigger value="schedule">Lịch học</TabsTrigger>
              <TabsTrigger value="assignments">Bài tập</TabsTrigger>
              <TabsTrigger value="grades">Kết quả học tập</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <StudentOverviewTab classId={classId} submittedIds={progress.submittedIds} onOpenAssignments={() => setTab("assignments")} />
            </TabsContent>
            <TabsContent value="schedule">
              <StudentScheduleTab classId={classId} clazz={clazz} />
            </TabsContent>
            <TabsContent value="assignments">
              <AssignmentsSection classId={classId} canManage={false} canTake />
            </TabsContent>
            <TabsContent value="grades">
              <StudentGradesTab classId={classId} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      {withAside ? <ClassProgressAside classId={classId} clazz={clazz} progress={progress} /> : null}
    </div>
  );
}
