import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssignmentsSection } from "@/features/assignments/assignments-section";
import { MaterialsSection } from "@/features/materials/materials-section";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import type { ClassSummary, Paginated } from "@/types/api";

/**
 * Trang lớp của sinh viên (/me/classes/[id]) — xem danh sách + tải học liệu (FR-MAT-02).
 * Lấy tên lớp từ danh sách lớp đã ghi danh; vào trực tiếp bằng URL thì fallback "Lớp học".
 */
export function MyClassMaterialsPage({ classId }: { classId: string }) {
  const { status: guard } = useAuthGuard(["student"]);
  const [tab, setTab] = useState("assignments");

  const classesQuery = useQuery({
    queryKey: queryKeys.me.classes(),
    queryFn: async ({ signal }) => {
      const data = await api.get<ClassSummary[] | Paginated<ClassSummary>>(
        "/me/classes",
        { page: 1, limit: 50 },
        signal
      );
      return Array.isArray(data) ? data : data.items;
    },
    enabled: guard === "ok",
  });

  if (guard !== "ok") return null;

  const clazz = classesQuery.data?.find((c) => String(c.id) === classId);

  return (
    <div className="space-y-6">
      <Link
        to="/me/classes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Lớp của tôi
      </Link>

      <PageHeader
        title={clazz ? clazz.name : "Học liệu lớp"}
        description={
          clazz
            ? `Mã lớp ${clazz.code} · Học kỳ ${clazz.semester}`
            : "Danh sách học liệu giảng viên chia sẻ cho lớp."
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="assignments">Bài tập & Quiz</TabsTrigger><TabsTrigger value="materials">Học liệu</TabsTrigger></TabsList>
        <TabsContent value="assignments" className="mt-4"><AssignmentsSection classId={classId} canManage={false} /></TabsContent>
        <TabsContent value="materials" className="mt-4"><MaterialsSection classId={classId} canManage={false} /></TabsContent>
      </Tabs>
    </div>
  );
}
