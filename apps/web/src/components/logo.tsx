import { cn } from "@/lib/utils";

/**
 * Logo LMS-P — badge monogram "bộ tầng tri thức tăng dần":
 * rounded square vàng đồng chứa 3 thanh ink navy cao dần (sách/bậc thang
 * tri thức). Dùng token --gold + --mark-ink nên ăn theo theme, vẫn rõ ở 16px.
 */

interface LogoProps {
  /** Kích thước badge (px) — wordmark tự scale theo. */
  size?: number;
  /** "full" = badge + wordmark "LMS-P", "mark" = chỉ badge. */
  variant?: "full" | "mark";
  /** Dòng chú thích dưới wordmark (chỉ dùng khi variant="full"). */
  caption?: string;
  className?: string;
}

export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="LMS-P"
      className={cn("shrink-0", className)}
    >
      <rect x="2" y="2" width="44" height="44" rx="12" fill="var(--gold)" />
      <rect x="13" y="28" width="6" height="8" rx="1.5" fill="var(--mark-ink)" />
      <rect x="21" y="21" width="6" height="15" rx="1.5" fill="var(--mark-ink)" />
      <rect x="29" y="14" width="6" height="22" rx="1.5" fill="var(--mark-ink)" />
    </svg>
  );
}

export function Logo({
  size = 32,
  variant = "full",
  caption,
  className,
}: LogoProps) {
  if (variant === "mark") {
    return <LogoMark size={size} className={className} />;
  }

  const textScale = Math.max(0.8, Math.min(1.15, size / 36));

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      <span
        className="leading-none"
        style={{ fontSize: `${textScale}rem` }}
      >
        <span className="block font-heading font-bold tracking-tight">
          LMS-P
        </span>
        {caption ? (
          <span className="mt-1 block text-xs font-normal opacity-60">
            {caption}
          </span>
        ) : null}
      </span>
    </span>
  );
}
