import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeadlinesFragment, SubmissionFragment } from "@/components/landing/product-fragments";

interface HeroSectionProps {
  ctaHref: string;
  ctaLabel: string;
}

/** Hero — một câu giá trị + CTA; bên phải là mảnh giao diện thật. */
export function HeroSection({ ctaHref, ctaLabel }: HeroSectionProps) {
  return (
    <section className="border-b">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[1fr_minmax(0,28rem)]">
        <div className="space-y-5">
          <h1 className="max-w-xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Lớp học, bài tập và chấm code tự động trong một nơi.
          </h1>
          <p className="max-w-lg text-base text-muted-foreground">
            Giảng viên chia sẻ học liệu, giao bài và quiz theo lớp. Sinh viên nộp bài lập trình và
            xem kết quả chấm từng test ngay khi có.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="cta" size="lg">
              <Link to={ctaHref}>{ctaLabel} <ArrowRight aria-hidden /></Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <a href="#hoc-lieu">Xem chức năng</a>
            </Button>
          </div>
        </div>
        <div className="relative grid gap-3">
          <DeadlinesFragment />
          <SubmissionFragment className="sm:ml-10" />
        </div>
      </div>
    </section>
  );
}
