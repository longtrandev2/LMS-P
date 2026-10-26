import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MaterialsSection } from "@/features/materials/materials-section";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { ClassStatusPill } from "./my-class-card";
import { useMyClasses } from "./use-my-classes";

/** Nhãn "sắp ra mắt" cho tab chưa có ở phase này */
function SoonBadge() {
  return (
    <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tracking-normal normal-case text-muted-foreground">
      Sắp ra mắt
    </span>
  );
}

/**
 * Chi tiết lớp của sinh viên (/me/classes/:id): header thông tin lớp + tabs.
 * Học liệu tái dùng MaterialsSection; Bài tập/Điểm chờ phase sau.
 */
export function MyClassPage({ classId }: { classId: string }) {
  const { status: guard } = useAuthGuard(["student"]);
  const classesQuery = useMyClasses(guard === "ok");

  if (guard !== "ok") return null;

  const clazz = classesQuery.data?.find((c) => String(c.id) === classId);

  return (
    <div className="space-y-6">
      <Link
        to="/me/classes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Lớp học
      </Link>

      <PageHeader
        title={clazz ? clazz.name : "Lớp học"}
        description={
          clazz
            ? `Mã lớp ${clazz.code} · Học kỳ ${clazz.semester}${clazz.lecturer_name ? ` · GV: ${clazz.lecturer_name}` : ""} · Khóa ${clazz.course_name}`
            : "Danh sách học liệu giảng viên chia sẻ cho lớp."
        }
        actions={<ClassStatusPill status={clazz?.status} />}
      />

      <Tabs defaultValue="materials">
        <TabsList>
          <TabsTrigger value="materials">Học liệu</TabsTrigger>
          <TabsTrigger value="assignments" disabled>
            Bài tập <SoonBadge />
          </TabsTrigger>
          <TabsTrigger value="grades" disabled>
            Điểm <SoonBadge />
          </TabsTrigger>
        </TabsList>
        <TabsContent value="materials" className="mt-4">
          <MaterialsSection classId={classId} canManage={false} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
