import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Info, MonitorDot, Pencil, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { ErrorState, ListSkeleton } from "@/components/state-blocks";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import { queryKeys } from "@/lib/query-keys";
import { categoryLabel, formatPoints } from "@/features/assignments/lecturer/labels";
import { minutesLabel, paperModeLabel, variantCode } from "@/features/exams/shared/exam-labels";
import { PaperView } from "./papers/paper-view";
import { PapersStats, PapersWarnings } from "./papers/papers-stats";
import { ReseedDialog } from "./papers/reseed-dialog";
import { RulesPoolTable } from "./papers/rules-pool-table";
import type { AssignmentDetails } from "@/types/api";
import type { PapersPreview, PreviewPaper } from "@/types/exams";

function paperTitle(paper: PreviewPaper, mode: PapersPreview["paper_mode"], index: number): string {
  if (mode === "per_student") return "Đề mẫu";
  if (paper.code) return `Đề ${paper.code}`;
  return mode === "variants" ? `Đề ${variantCode(index + 1)}` : "Đề chung";
}

const NOTE = {
  same: "Cả lớp làm cùng đề này.",
  variants: "Mỗi sinh viên nhận một mã đề; số sinh viên mỗi mã chênh nhau tối đa 1.",
  per_student: "Mỗi sinh viên nhận một đề bốc riêng từ kho khi bắt đầu làm — dưới đây là một đề mẫu.",
} as const;

/** `/classes/:classId/assignments/:assignmentId/papers` — xem trước đề / mã đề / đề mẫu (exam-spec.md §3.5, §8). */
export function PapersPreviewPage() {
  const { classId = "", assignmentId = "" } = useParams();
  const id = Number(assignmentId);
  const { status } = useAuthGuard(["lecturer", "admin"]);
  const client = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const details = useQuery({
    queryKey: queryKeys.assignments.details(id),
    queryFn: ({ signal }) => api.get<AssignmentDetails>(`/assignments/${id}`, undefined, signal),
    enabled: status === "ok",
  });
  const preview = useQuery({
    queryKey: queryKeys.exams.papers(id),
    queryFn: ({ signal }) => api.get<PapersPreview>(`/assignments/${id}/papers`, undefined, signal),
    enabled: status === "ok",
  });
  const reseed = useMutation({
    mutationFn: () => api.post<PapersPreview>(`/assignments/${id}/papers/reseed`),
    onSuccess: (data) => { client.setQueryData(queryKeys.exams.papers(id), data); setConfirming(false); toast.success("Đã bốc lại bộ đề mới."); },
    onError: (error) => toast.error(errorText(error)),
  });
  if (status !== "ok") return null;
  const failed = details.error ?? preview.error;
  if (failed) return <ErrorState error={failed} onRetry={() => { void details.refetch(); void preview.refetch(); }} />;
  if (!details.data || !preview.data) return <div aria-busy="true" aria-label="Đang tải" className="space-y-6"><ListSkeleton rows={6} /></div>;

  const a = details.data.assignment;
  const data = preview.data;
  const draft = !a.is_published;
  const base = `/classes/${classId}/assignments/${id}`;
  const meta = [categoryLabel(a.category), paperModeLabel(data.paper_mode, a.variant_count), minutesLabel(a.time_limit_minutes), draft ? "Bản nháp" : "Đã xuất bản"]
    .filter(Boolean).join(" · ");

  return <div className="space-y-8">
    <PageHeader title={a.title} meta={<span>Xem trước đề · {meta}</span>}
      actions={draft ? <>
        <Button variant="secondary" disabled={reseed.isPending} onClick={() => setConfirming(true)}><Shuffle aria-hidden />Bốc lại</Button>
        <Button variant="secondary" asChild><Link to={`${base}/edit`}><Pencil aria-hidden />Sửa đề</Link></Button>
      </> : <Button variant="secondary" asChild><Link to={`${base}/monitor`}><MonitorDot aria-hidden />Giám sát</Link></Button>} />

    <p className="flex gap-2.5 rounded-lg bg-info/8 px-4 py-3 text-sm text-info">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{NOTE[data.paper_mode]} {draft ? "Đề sinh tất định từ seed: nếu ngân hàng không đổi, đây chính là đề sẽ được xuất bản." : "Đề đã được ghim khi xuất bản."}</span>
    </p>
    <PapersWarnings preview={data} />
    <PapersStats preview={data} />

    <section aria-labelledby="papers-title" className="space-y-4">
      <h2 id="papers-title" className="text-base font-semibold">{data.papers.length > 1 ? "Các mã đề" : data.papers[0] ? paperTitle(data.papers[0], data.paper_mode, 0) : "Đề"}</h2>
      {data.papers.length === 0 ? <p className="text-sm text-muted-foreground">Chưa có câu nào trong đề.</p>
        : data.papers.length === 1 ? <PaperView paper={data.papers[0]} />
          : <Tabs defaultValue="0" className="gap-4">
            <TabsList className="flex-wrap">
              {data.papers.map((paper, index) => <TabsTrigger key={index} value={String(index)}>
                {paperTitle(paper, data.paper_mode, index)} <span className="text-xs font-normal text-muted-foreground tabular-nums">{formatPoints(paper.total_points)} đ</span>
              </TabsTrigger>)}
            </TabsList>
            {data.papers.map((paper, index) => <TabsContent key={index} value={String(index)}><PaperView paper={paper} /></TabsContent>)}
          </Tabs>}
    </section>

    {data.rules.length ? <section aria-labelledby="pool-title" className="space-y-3">
      <div>
        <h2 id="pool-title" className="text-base font-semibold">Kho câu theo quy tắc</h2>
        <p className="text-sm text-muted-foreground">Kho = câu khớp điều kiện, trừ câu cố định và câu đã thuộc kho của quy tắc đứng trước.</p>
      </div>
      <RulesPoolTable preview={data} rules={details.data.draw_rules ?? []} sections={details.data.sections ?? []} />
    </section> : null}

    <ReseedDialog open={confirming} busy={reseed.isPending} onCancel={() => setConfirming(false)} onConfirm={() => reseed.mutate()} />
  </div>;
}
