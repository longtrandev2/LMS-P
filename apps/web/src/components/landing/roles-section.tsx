"use client";

import {
  GraduationCap,
  Presentation,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useReveal } from "@/lib/hooks/use-reveal";
import { SectionHeading } from "@/components/landing/section-heading";

interface Role {
  icon: LucideIcon;
  title: string;
  description: string;
}

const ROLES: Role[] = [
  {
    icon: ShieldCheck,
    title: "Quản trị",
    description:
      "Quản lý tài khoản và phân quyền, cấu hình hệ thống, theo dõi nhật ký kiểm toán và thống kê hoạt động.",
  },
  {
    icon: Presentation,
    title: "Giảng viên",
    description:
      "Tạo lớp học phần, soạn ngân hàng đề, giao bài tập và kỳ thi trực tuyến, chốt sổ điểm theo trọng số.",
  },
  {
    icon: GraduationCap,
    title: "Sinh viên",
    description:
      "Học tài liệu, làm bài và nộp bài lập trình, theo dõi kết quả chấm realtime và điểm số của mình.",
  },
];

/** Ba vai trò của hệ thống theo RBAC */
export function RolesSection() {
  const ref = useReveal<HTMLElement>();

  return (
    <section
      id="vai-tro"
      ref={ref}
      className="scroll-mt-20 border-t border-border py-20 md:py-24"
    >
      <div className="mx-auto w-full max-w-6xl px-6">
        <SectionHeading
          eyebrow="Vai trò"
          title="Mỗi người, một vùng làm việc riêng"
          description="Phân quyền dựa trên vai trò (RBAC): sinh viên, giảng viên và quản trị mỗi vai trò thấy đúng chức năng mình cần."
        />

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {ROLES.map((role) => (
            <Card
              key={role.title}
              data-reveal
              className="transition-transform duration-300 hover:-translate-y-1"
            >
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center bg-primary text-primary-foreground">
                    <role.icon className="size-5" strokeWidth={1.75} />
                  </span>
                  <h3 className="font-heading text-lg font-semibold text-card-foreground">
                    {role.title}
                  </h3>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {role.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
