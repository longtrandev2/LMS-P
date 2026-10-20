"use client";

import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useReveal } from "@/lib/hooks/use-reveal";
import { SectionHeading } from "@/components/landing/section-heading";

type ClassStatus = "Đang mở" | "Sắp mở" | "Đã kết thúc";

interface SampleClass {
  code: string;
  name: string;
  lecturer: string;
  students: number;
  progress: number;
  status: ClassStatus;
}

/** Dữ liệu minh họa cho card lớp học phần (grid kiểu Open edX) */
const SAMPLE_CLASSES: SampleClass[] = [
  {
    code: "IT3090 · NH21",
    name: "Lập trình mạng",
    lecturer: "ThS. Trần Quốc Bảo",
    students: 42,
    progress: 68,
    status: "Đang mở",
  },
  {
    code: "IT3090 · NH22",
    name: "Lập trình mạng — thực hành",
    lecturer: "ThS. Trần Quốc Bảo",
    students: 38,
    progress: 41,
    status: "Đang mở",
  },
  {
    code: "IT4082 · NH11",
    name: "Lập trình mạng nâng cao",
    lecturer: "PGS. TS. Lê Hoài Nam",
    students: 30,
    progress: 0,
    status: "Sắp mở",
  },
];

const STATUS_STYLES: Record<ClassStatus, string> = {
  "Đang mở": "border-success/40 bg-success/10 text-success",
  "Sắp mở": "border-gold/40 bg-gold/10 text-gold",
  "Đã kết thúc": "border-border bg-muted text-muted-foreground",
};

/** Danh mục lớp học phần — card grid kiểu cổng đào tạo */
export function ClassesSection() {
  const ref = useReveal<HTMLElement>();

  return (
    <section
      id="lop-hoc-phan"
      ref={ref}
      className="scroll-mt-20 border-y border-border bg-secondary/50 py-20 md:py-24"
    >
      <div className="mx-auto w-full max-w-6xl px-6">
        <SectionHeading
          eyebrow="Lớp học phần"
          title="Khám phá lớp học phần đang mở"
          description="Mỗi lớp học phần gắn với một khóa học, một giảng viên phụ trách và danh sách sinh viên ghi danh."
        />

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {SAMPLE_CLASSES.map((cls) => (
            <Card
              key={cls.code}
              data-reveal
              className="transition-transform duration-300 hover:-translate-y-1"
            >
              {/* Visual đầu card: dải mã học phần kiểu bìa giáo trình */}
              <div className="flex items-center justify-between border-b border-border bg-muted px-4 py-3">
                <span className="font-mono text-xs font-medium text-card-foreground">
                  {cls.code}
                </span>
                <span
                  className={`border px-2 py-0.5 text-[11px] font-semibold tracking-wide ${STATUS_STYLES[cls.status]}`}
                >
                  {cls.status}
                </span>
              </div>
              <CardContent className="flex flex-col gap-4 pt-4">
                <h3 className="font-heading text-lg font-semibold text-card-foreground">
                  {cls.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  GV: {cls.lecturer}
                </p>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users className="size-4" strokeWidth={1.75} />
                  {cls.students} sinh viên
                </p>
                <div className="mt-auto">
                  <div
                    className="h-1 w-full bg-muted"
                    role="progressbar"
                    aria-valuenow={cls.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Tiến độ ${cls.name}`}
                  >
                    <div
                      className="h-full bg-gold"
                      style={{ width: `${cls.progress}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] tabular-nums text-muted-foreground">
                    Hoàn thành {cls.progress}%
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div data-reveal className="mt-10 text-center">
          <Button asChild variant="outline">
            <Link href="/login">
              Đăng nhập để xem lớp của bạn
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
