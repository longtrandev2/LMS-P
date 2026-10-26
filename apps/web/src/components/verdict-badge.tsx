import { cn } from "@/lib/utils";
import { VERDICT_LABEL, verdictTone } from "@/lib/verdicts";
import type { GradingVerdict } from "@/types/api";

const toneClass = {
  success: "border-success/30 bg-success/10 text-success",
  danger: "border-destructive/30 bg-destructive/10 text-destructive",
  warning: "border-gold/30 bg-gold/10 text-gold",
  neutral: "border-border bg-muted text-muted-foreground",
};

/** Badge verdict: mã (AC/WA…) + nhãn tiếng Việt. `compact` chỉ hiện mã. */
export function VerdictBadge({ verdict, compact = false, className }: {
  verdict: GradingVerdict | null | undefined; compact?: boolean; className?: string;
}) {
  if (!verdict) return null;
  return <span title={VERDICT_LABEL[verdict]} className={cn(
    "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-xs font-semibold", toneClass[verdictTone(verdict)], className)}>
    {verdict === "SYSTEM_ERROR" ? "SE" : verdict}
    {compact ? null : <span className="font-sans font-medium">{VERDICT_LABEL[verdict]}</span>}
  </span>;
}
