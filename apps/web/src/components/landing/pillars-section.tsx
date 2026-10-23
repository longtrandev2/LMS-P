import type { ReactNode } from "react";
import { useReveal } from "@/lib/hooks/use-reveal";
import { SectionHeading } from "@/components/landing/section-heading";
import {
  AssignmentListFragment,
  JudgeResultFragment,
  SectionListFragment,
} from "@/components/landing/feature-fragments";

interface Capability {
  number: string;
  title: string;
  description: string;
  fragment: ReactNode;
}

/** 3 nhóm năng lực đúng spec — mô tả 1 câu, minh họa bằng fragment UI thật */
const CAPABILITIES: Capability[] = [
  {
    number: "01",
    title: "Quản trị lớp học & học phần",
    description:
      "Tạo lớp học phần theo học kỳ, ghi danh sinh viên và phân công giảng viên phụ trách — mỗi lớp gắn với một khóa học duy nhất.",
    fragment: <SectionListFragment />,
  },
  {
    number: "02",
    title: "Học liệu, bài tập & ngân hàng đề",
    description:
      "Học liệu theo từng chương, bài tập có hạn nộp và giới hạn số lần nộp, ngân hàng câu hỏi trắc nghiệm kèm test case công khai và ẩn.",
    fragment: <AssignmentListFragment />,
  },
  {
    number: "03",
    title: "Chấm bài tự động & realtime",
    description:
      "Bài nộp viết bằng Python, C, C++ hoặc Java được chấm tự động trong môi trường cách ly; kết quả từng test trả về sinh viên ngay khi chấm xong.",
    fragment: <JudgeResultFragment />,
  },
];

/** Section "Năng lực" — dòng đánh số, text trái + fragment UI phải */
export function PillarsSection() {
  const ref = useReveal<HTMLElement>();

  return (
    <section id="tinh-nang" ref={ref} className="scroll-mt-20 py-16 md:py-24">
      <div className="mx-auto w-full max-w-6xl px-6">
        <SectionHeading
          title="Năng lực hệ thống"
          description="Ba nhóm chức năng chính, mỗi nhóm là một phần việc thật của lớp học phần — không hơn, không kém."
        />

        <div className="mt-12 flex flex-col">
          {CAPABILITIES.map((item) => (
            <div
              key={item.number}
              data-reveal
              className="grid items-center gap-8 border-t border-border py-10 first:border-t-0 first:pt-0 md:grid-cols-2 md:py-12"
            >
              <div className="flex gap-5">
                <span className="pt-1 font-mono text-sm text-muted-foreground tabular-nums">
                  {item.number}
                </span>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight">
                    {item.title}
                  </h3>
                  <p className="mt-2.5 max-w-md text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
              <div className="md:justify-self-end md:w-full md:max-w-md">
                {item.fragment}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
