import { Loader2 } from "lucide-react";
import { VerdictBadge } from "@/components/verdict-badge";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_LABEL } from "@/features/assignments/lecturer/labels";
import type { GradingVerdict, SubmissionStatus } from "@/types/api";

export const isGrading = (status: SubmissionStatus | null | undefined) => status === "pending" || status === "grading";

/** Trạng thái chấm: đang chờ/đang chấm có spinner; đã có verdict thì hiện `VerdictBadge`. */
export function SubmissionStatusBadge({ status, verdict, compact = false, className }: {
  status: SubmissionStatus | null | undefined; verdict?: GradingVerdict | null; compact?: boolean; className?: string;
}) {
  if (isGrading(status)) {
    return <Badge variant="secondary" className={cn("border-border", className)}>
      <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden />{STATUS_LABEL[status as SubmissionStatus]}
    </Badge>;
  }
  if (verdict) return <VerdictBadge verdict={verdict} compact={compact} className={className} />;
  if (status === "failed") {
    return <Badge variant="destructive" className={className}>{STATUS_LABEL.failed}</Badge>;
  }
  if (status === "completed") {
    return <Badge variant="outline" className={cn("text-muted-foreground", className)}>{STATUS_LABEL.completed}</Badge>;
  }
  return null;
}
