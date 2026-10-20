"use client";

import {
  FolderOpen,
  School,
  SquareTerminal,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useReveal } from "@/lib/hooks/use-reveal";
import { SectionHeading } from "@/components/landing/section-heading";

interface Pillar {
  icon: LucideIcon;
  title: string;
  description: string;
}

const PILLARS: Pillar[] = [
  {
    icon: School,
    title: "Quản lý lớp học & học phần",
    description:
      "Khóa học, lớp học phần và ghi danh sinh viên được tổ chức tập trung theo học kỳ — mỗi vai trò chỉ thấy đúng phần việc của mình.",
  },
  {
    icon: FolderOpen,
    title: "Học liệu, bài tập & ngân hàng đề",
    description:
      "Tài liệu theo từng chương, bài tập với hạn nộp và số lần nộp, ngân hàng câu hỏi trắc nghiệm kèm test case công khai và ẩn.",
  },
  {
    icon: SquareTerminal,
    title: "Chấm bài lập trình tự động",
    description:
      "Bài nộp vào hàng đợi RabbitMQ, worker chấm trong sandbox Docker cô lập, kết quả đẩy về sinh viên realtime qua WebSocket.",
  },
];

/** 3 trụ cột năng lực hệ thống theo spec */
export function PillarsSection() {
  const ref = useReveal<HTMLElement>();

  return (
    <section id="tinh-nang" ref={ref} className="scroll-mt-20 py-20 md:py-24">
      <div className="mx-auto w-full max-w-6xl px-6">
        <SectionHeading
          eyebrow="Tính năng cốt lõi"
          title="Ba trụ cột của một lớp học hiện đại"
          description="Mọi năng lực trên landing đều đối chiếu trực tiếp với đặc tả yêu cầu của hệ thống."
        />

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {PILLARS.map((pillar) => (
            <Card
              key={pillar.title}
              data-reveal
              className="transition-transform duration-300 hover:-translate-y-1"
            >
              <CardContent className="flex flex-col gap-4">
                <span className="flex size-11 items-center justify-center border border-border bg-background text-gold">
                  <pillar.icon className="size-5" strokeWidth={1.75} />
                </span>
                <h3 className="font-heading text-lg font-semibold text-card-foreground">
                  {pillar.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {pillar.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
