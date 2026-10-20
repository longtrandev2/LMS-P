interface SectionHeadingProps {
  title: string;
  description?: string;
}

/** Tiêu đề section — trái, sans, không eyebrow, không trang trí */
export function SectionHeading({ title, description }: SectionHeadingProps) {
  return (
    <div data-reveal className="max-w-xl">
      <h2 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}
