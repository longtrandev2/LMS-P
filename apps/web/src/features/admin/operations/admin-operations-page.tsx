import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { FailedSubmission, Page, QueueHealth } from "@/types/admin";
import { AnnouncementsTab } from "./announcements-tab";
import { DeadQueuesTab } from "./dead-queues-tab";
import { FailedSubmissionsTab } from "./failed-submissions-tab";

const TABS = ["failed", "queues", "announcements"] as const;
type Tab = (typeof TABS)[number];

function Count({ n, alert }: { n: number | undefined; alert?: boolean }) {
  if (!n) return null;
  return <span className={alert ? "rounded-md bg-destructive/10 px-1.5 text-xs text-destructive tabular-nums" : "text-xs text-muted-foreground tabular-nums"}>{n}</span>;
}

/** Vận hành: job chấm lỗi, hàng đợi chết, thông báo hệ thống — docs/admin-spec.md §4, §5.1, §9. */
export function AdminOperationsPage() {
  const { status } = useAuthGuard(["admin"]);
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab");
  const tab: Tab = TABS.includes(raw as Tab) ? (raw as Tab) : "failed";
  const ok = status === "ok";
  // Số đếm trên tab dùng chung cache với nội dung tab (cùng query key).
  const failed = useQuery({
    queryKey: queryKeys.admin.failed(1),
    queryFn: ({ signal }) => api.get<Page<FailedSubmission>>("/admin/grading/failed", { page: 1, limit: 20 }, signal),
    enabled: ok,
  });
  const queues = useQuery({
    queryKey: queryKeys.admin.queues,
    queryFn: ({ signal }) => api.get<QueueHealth>("/health/queue", undefined, signal),
    refetchInterval: 10_000,
    enabled: ok,
  });
  if (!ok) return null;
  const deadMessages = queues.data?.queues.filter((q) => q.name.endsWith(".dead")).reduce((sum, q) => sum + q.messages, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Vận hành" description="Xử lý bài chấm lỗi, dọn hàng đợi chết và gửi thông báo tới người dùng. Mọi thao tác được ghi nhật ký kiểm toán." />
      <Tabs value={tab} onValueChange={(value) => setParams(value === "failed" ? {} : { tab: value }, { replace: true })} className="gap-5">
        <TabsList variant="line">
          <TabsTrigger value="failed">Bài chấm lỗi <Count n={failed.data?.total} alert /></TabsTrigger>
          <TabsTrigger value="queues">Hàng đợi chết <Count n={deadMessages} alert /></TabsTrigger>
          <TabsTrigger value="announcements">Thông báo hệ thống</TabsTrigger>
        </TabsList>
        <TabsContent value="failed"><FailedSubmissionsTab /></TabsContent>
        <TabsContent value="queues"><DeadQueuesTab /></TabsContent>
        <TabsContent value="announcements"><AnnouncementsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
