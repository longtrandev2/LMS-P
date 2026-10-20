interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
}

/** Tiêu đề section đồng bộ: eyebrow uppercase vàng đồng + h2 serif */
export function SectionHeading({
  eyebrow,
  title,
  description,
}: SectionHeadingProps) {
  return (
    <div data-reveal className="mx-auto max-w-2xl text-center">
      <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-gold">
        {eyebrow}
      </p>
      <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-balance md:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}
