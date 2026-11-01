import { AlertTriangle, CheckCircle2, FileStack, ListOrdered, Sigma, type LucideIcon } from "lucide-react";
import { AlertDescription, AlertTitle, Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { formatPoints } from "@/features/assignments/lecturer/labels";
import { variantCode } from "@/features/exams/shared/exam-labels";
import type { PapersPreview } from "@/types/exams";

function Tile({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone: string }) {
  return <div className={cn("flex items-center justify-between gap-3 rounded-xl p-4", tone)}>
    <span className="flex items-center gap-2 text-[13px]"><Icon className="size-4" aria-hidden />{label}</span>
    <span className="text-2xl font-semibold tabular-nums">{value}</span>
  </div>;
}

/** Ô thống kê (S-Link, DESIGN.md §4): số đề, câu mỗi đề, tổng điểm, quy tắc thiếu kho. */
export function PapersStats({ preview }: { preview: PapersPreview }) {
  const first = preview.papers[0];
  const short = preview.rules.filter((rule) => rule.pool_size < rule.requested).length;
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <Tile icon={FileStack} label={preview.paper_mode === "per_student" ? "Đề mẫu" : "Số đề"} value={String(preview.papers.length)} tone="bg-brand-soft text-primary" />
    <Tile icon={ListOrdered} label="Câu mỗi đề" value={first ? String(first.question_count) : "0"} tone="bg-secondary text-foreground" />
    <Tile icon={Sigma} label="Tổng điểm" value={first ? formatPoints(first.total_points) : "0"} tone="bg-info/10 text-info" />
    {short ? <Tile icon={AlertTriangle} label="Quy tắc thiếu câu" value={String(short)} tone="bg-destructive/8 text-destructive" />
      : <Tile icon={CheckCircle2} label="Quy tắc đủ kho" value={`${preview.rules.length}/${preview.rules.length}`} tone="bg-success/10 text-success" />}
  </div>;
}

/** Cảnh báo từ server + tổng điểm các mã lệch nhau. */
export function PapersWarnings({ preview }: { preview: PapersPreview }) {
  const totals = Object.entries(preview.variant_totals);
  const uneven = new Set(totals.map(([, total]) => total)).size > 1;
  const short = preview.rules.filter((rule) => rule.pool_size < rule.requested);
  if (!preview.warnings.length && !uneven && !short.length) return null;
  return <Alert variant="warning">
    <AlertTriangle aria-hidden />
    <AlertTitle>Đề chưa sẵn sàng để xuất bản</AlertTitle>
    <AlertDescription>
      <ul className="list-disc space-y-0.5 pl-4">
        {preview.warnings.map((warning) => <li key={warning}>{warning}</li>)}
        {short.length && !preview.warnings.length ? <li>{short.length} quy tắc không đủ câu trong kho — xem bảng kho câu bên dưới.</li> : null}
        {uneven ? <li>Tổng điểm lệch: {totals.map(([no, total]) => `Đề ${variantCode(Number(no))} ${formatPoints(total)} đ`).join(" · ")}.</li> : null}
      </ul>
    </AlertDescription>
  </Alert>;
}
