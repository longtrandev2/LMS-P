import { Loader2 } from "lucide-react";
import { VerdictBadge } from "@/components/verdict-badge";
import { cn } from "@/lib/utils";
import { STATUS_LABEL } from "@/features/assignments/lecturer/labels";
import type { GradingVerdict, SubmissionStatus } from "@/types/api";

export const isGrading = (status: SubmissionStatus | null | undefined) => status === "pending" || status === "grading";

/** Trạng thái chấm: đang chờ/đang chấm có spinner; đã có verdict thì hiện `VerdictBadge`. */
export function SubmissionStatusBadge({ status, verdict, compact = false, className }: {
  status: SubmissionStatus | null | undefined; verdict?: GradingVerdict | null; compact?: boolean; className?: string;
}) {
  if (isGrading(status)) {
    return <span className={cn("inline-flex items-center gap-1.5 rounded-md border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground", className)}>
      <Loader2 className="size-3 animate-spin motion-reduce:animate-none" aria-hidden />{STATUS_LABEL[status as SubmissionStatus]}
    </span>;
  }
  if (verdict) return <VerdictBadge verdict={verdict} compact={compact} className={className} />;
  if (status === "failed") {
    return <span className={cn("inline-flex items-center rounded-md border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive", className)}>{STATUS_LABEL.failed}</span>;
  }
  if (status === "completed") {
    return <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium text-muted-foreground", className)}>{STATUS_LABEL.completed}</span>;
  }
  return null;
}
