import { useReveal } from "@/lib/hooks/use-reveal";
import { SectionHeading } from "@/components/landing/section-heading";

interface Role {
  title: string;
  duties: string[];
}

/** 3 vai trò theo RBAC — chỉ text: tên vai trò + các việc được làm */
const ROLES: Role[] = [
  {
    title: "Quản trị",
    duties: [
      "Quản lý tài khoản và phân quyền theo vai trò",
      "Cấu hình khóa học, học kỳ và hệ thống",
      "Theo dõi nhật ký hoạt động của toàn hệ thống",
    ],
  },
  {
    title: "Giảng viên",
    duties: [
      "Tạo lớp học phần và ghi danh sinh viên",
      "Soạn học liệu, bài tập và ngân hàng đề",
      "Tổ chức kỳ thi trực tuyến, chốt điểm theo trọng số",
    ],
  },
  {
    title: "Sinh viên",
    duties: [
      "Học tài liệu và làm bài trực tuyến",
      "Nộp bài lập trình, xem kết quả chấm từng test",
      "Theo dõi điểm số của từng lớp học phần",
    ],
  },
];

/** Ba vai trò của hệ thống — 3 cột text đơn giản, không icon */
export function RolesSection() {
  const ref = useReveal<HTMLElement>();

  return (
    <section id="vai-tro" ref={ref} className="scroll-mt-20 py-16 md:py-24">
      <div className="mx-auto w-full max-w-6xl px-6">
        <SectionHeading
          title="Mỗi người, một vùng làm việc riêng"
          description="Sinh viên, giảng viên và quản trị đăng nhập bằng tài khoản được cấp — mỗi vai trò chỉ thấy đúng chức năng mình cần."
        />

        <div className="mt-12 grid gap-10 border-t border-border pt-10 md:grid-cols-3 md:gap-8">
          {ROLES.map((role) => (
            <div key={role.title} data-reveal>
              <h3 className="text-base font-semibold tracking-tight">
                {role.title}
              </h3>
              <ul className="mt-4 flex flex-col gap-2.5">
                {role.duties.map((duty) => (
                  <li
                    key={duty}
                    className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-2 h-px w-3 shrink-0 bg-border"
                    />
                    {duty}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
