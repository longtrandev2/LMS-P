import { cn } from "@/lib/utils";
import { VERDICT_LABEL, verdictTone } from "@/lib/verdicts";
import type { GradingVerdict } from "@/types/api";

const toneClass = {
  success: "bg-success/12 text-success",
  danger: "bg-destructive/10 text-destructive",
  warning: "bg-warning/14 text-warning",
  neutral: "bg-secondary text-muted-foreground",
};

/** Badge verdict: mã (AC/WA…) + nhãn tiếng Việt. `compact` chỉ hiện mã. */
export function VerdictBadge({ verdict, compact = false, className }: {
  verdict: GradingVerdict | null | undefined; compact?: boolean; className?: string;
}) {
  if (!verdict) return null;
  return <span title={VERDICT_LABEL[verdict]} className={cn(
    "inline-flex h-5 items-center gap-1.5 rounded-md px-1.5 font-mono text-xs font-semibold", toneClass[verdictTone(verdict)], className)}>
    {verdict === "SYSTEM_ERROR" ? "SE" : verdict}
    {compact ? null : <span className="font-sans font-medium">{VERDICT_LABEL[verdict]}</span>}
  </span>;
}
