import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/state-blocks";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { MyClassCard } from "./my-class-card";
import { useMyClasses } from "./use-my-classes";

/** Lớp học của sinh viên (/me/classes) — grid thẻ lớp với trạng thái */
export function MyClassesPage() {
  const { status: guard } = useAuthGuard(["student"]);
  const query = useMyClasses(guard === "ok");

  if (guard !== "ok") return null;

  const classes = query.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lớp học"
        description="Các lớp học phần bạn đang ghi danh trong học kỳ này."
      />

      {query.isPending ? (
        <CardGridSkeleton />
      ) : query.isError ? (
        <Card>
          <CardContent className="p-0">
            <ErrorState error={query.error} onRetry={() => query.refetch()} />
          </CardContent>
        </Card>
      ) : classes && classes.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              title="Bạn chưa được ghi danh vào lớp nào"
              description="Hãy liên hệ giảng viên hoặc quản trị khoa để được thêm vào lớp học phần."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes?.map((clazz) => (
            <MyClassCard key={clazz.id} clazz={clazz} />
          ))}
        </div>
      )}
    </div>
  );
}
