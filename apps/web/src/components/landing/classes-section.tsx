import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReveal } from "@/lib/hooks/use-reveal";
import { SectionHeading } from "@/components/landing/section-heading";

type ClassStatus = "Đang mở" | "Sắp mở" | "Đã kết thúc";

interface SampleClass {
  code: string;
  name: string;
  lecturer: string;
  students: number;
  status: ClassStatus;
}

/** Dữ liệu minh họa cho danh sách lớp học phần */
const SAMPLE_CLASSES: SampleClass[] = [
  {
    code: "IT3090-11",
    name: "Cấu trúc dữ liệu và giải thuật",
    lecturer: "ThS. Trần Quốc Bảo",
    students: 42,
    status: "Đang mở",
  },
  {
    code: "IT3090-12",
    name: "Cấu trúc dữ liệu và giải thuật — thực hành",
    lecturer: "ThS. Trần Quốc Bảo",
    students: 38,
    status: "Đang mở",
  },
  {
    code: "IT4082-11",
    name: "Cơ sở dữ liệu",
    lecturer: "PGS. TS. Lê Hoài Nam",
    students: 30,
    status: "Sắp mở",
  },
  {
    code: "IT4082-12",
    name: "Cơ sở dữ liệu — thực hành",
    lecturer: "PGS. TS. Lê Hoài Nam",
    students: 28,
    status: "Đã kết thúc",
  },
];

/** Chip trạng thái — chỉ chữ + chấm màu, không nền màu */
const STATUS_STYLES: Record<ClassStatus, string> = {
  "Đang mở": "text-success",
  "Sắp mở": "text-muted-foreground",
  "Đã kết thúc": "text-muted-foreground",
};

const STATUS_DOTS: Record<ClassStatus, string> = {
  "Đang mở": "bg-success",
  "Sắp mở": "bg-muted-foreground/50",
  "Đã kết thúc": "bg-muted-foreground/30",
};

/** Danh mục lớp học phần — danh sách dày kiểu bảng app thật */
export function ClassesSection() {
  const ref = useReveal<HTMLElement>();

  return (
    <section
      id="lop-hoc-phan"
      ref={ref}
      className="scroll-mt-20 border-y border-border py-16 md:py-24"
    >
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            title="Lớp học phần"
            description="Mỗi lớp học phần gắn với một khóa học, một giảng viên phụ trách và danh sách sinh viên ghi danh theo học kỳ."
          />
          <Button asChild variant="outline" size="sm" data-reveal>
            <Link to="/login">
              Xem lớp của bạn
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>

        <div data-reveal className="mt-10 border-t border-border">
          {/* Hàng tiêu đề cột — ẩn trên mobile */}
          <div className="hidden grid-cols-[7rem_1fr_12rem_5rem_7rem] gap-4 border-b border-border px-4 py-2.5 text-[11px] font-medium text-muted-foreground md:grid">
            <span>Mã học phần</span>
            <span>Tên lớp</span>
            <span>Giảng viên</span>
            <span className="text-right">Sĩ số</span>
            <span className="text-right">Trạng thái</span>
          </div>

          <ul>
            {SAMPLE_CLASSES.map((cls) => (
              <li
                key={cls.code}
                className="grid grid-cols-1 gap-1.5 border-b border-border px-4 py-4 transition-colors duration-200 hover:border-foreground md:grid-cols-[7rem_1fr_12rem_5rem_7rem] md:items-center md:gap-4 md:py-3.5"
              >
                <span className="font-mono text-xs text-muted-foreground">
                  {cls.code}
                </span>
                <span className="text-sm font-medium text-foreground">
                  {cls.name}
                </span>
                <span className="text-sm text-muted-foreground">
                  {cls.lecturer}
                </span>
                <span className="font-mono text-xs text-muted-foreground tabular-nums md:text-right">
                  {cls.students} SV
                </span>
                <span
                  className={`flex items-center gap-1.5 text-xs md:justify-end ${STATUS_STYLES[cls.status]}`}
                >
                  <span
                    className={`size-1.5 shrink-0 rounded-full ${STATUS_DOTS[cls.status]}`}
                  />
                  {cls.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
