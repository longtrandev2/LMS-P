import { cn } from "@/lib/utils";

/**
 * Logo LMS-P — DESIGN.md §8: monogram "3 thanh cao dần" đơn sắc trong ô vuông bo góc màu
 * `--foreground`, tự đảo theo theme; wordmark LMS-P 600, tracking chặt.
 */

interface LogoProps {
  /** Kích thước monogram (px) — wordmark tự co theo. */
  size?: number;
  /** "full" = monogram + wordmark, "mark" = chỉ monogram. */
  variant?: "full" | "mark";
  /** Dòng phụ dưới wordmark (chỉ dùng khi variant="full"). */
  caption?: string;
  className?: string;
}

export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="LMS-P"
      className={cn("shrink-0", className)}
    >
      <rect x="0" y="0" width="48" height="48" rx="11" fill="var(--foreground)" />
      <rect x="12.5" y="28" width="6" height="9" rx="1.5" fill="var(--background)" />
      <rect x="21" y="20.5" width="6" height="16.5" rx="1.5" fill="var(--background)" />
      <rect x="29.5" y="13" width="6" height="24" rx="1.5" fill="var(--background)" />
    </svg>
  );
}

export function Logo({ size = 28, variant = "full", caption, className }: LogoProps) {
  if (variant === "mark") return <LogoMark size={size} className={className} />;
  const fontSize = Math.max(14, Math.min(20, Math.round(size * 0.55)));

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark size={size} />
      <span className="min-w-0 leading-none">
        <span className="block font-semibold tracking-[-0.03em]" style={{ fontSize }}>
          LMS-P
        </span>
        {caption ? (
          <span className="mt-1 block truncate text-xs font-normal text-muted-foreground">{caption}</span>
        ) : null}
      </span>
    </span>
  );
}
