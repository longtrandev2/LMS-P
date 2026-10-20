import type { Metadata } from "next";
import { Network, ShieldCheck, TerminalSquare, Workflow } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Đăng nhập" };

const HIGHLIGHTS = [
  {
    icon: TerminalSquare,
    title: "Thực hành trên sandbox",
    text: "Nộp bài lập trình, chấm tự động trong môi trường cô lập.",
  },
  {
    icon: Workflow,
    title: "Lớp học — bài tập — kỳ thi",
    text: "Toàn bộ hoạt động học tập gắn với lớp bạn ghi danh.",
  },
  {
    icon: ShieldCheck,
    title: "Quy chế minh bạch",
    text: "Hạn nộp, số lượt thử và điểm số được ghi nhận đầy đủ.",
  },
];

export default function LoginPage() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* Panel giới thiệu — ink navy, signature */}
      <section className="relative hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-gold/15 text-gold">
            <Network className="size-6" aria-hidden />
          </span>
          <div>
            <p className="font-heading text-lg font-bold">LMS Lập trình mạng</p>
            <p className="text-sm text-sidebar-foreground/60">Học kỳ 2026–2027 · Khoa Công nghệ thông tin</p>
          </div>
        </div>

        <div className="max-w-md space-y-8 py-10">
          <h1 className="font-heading text-4xl font-bold leading-tight">
            Nền tảng học tập dành cho môn{" "}
            <span className="text-gold">Lập trình mạng</span>
          </h1>
          <ul className="space-y-5">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title} className="flex gap-4">
                <item.icon className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden />
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-sidebar-foreground/65">{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-sidebar-foreground/40">
          Hệ thống dành cho sinh viên, giảng viên và quản trị khoa.
        </p>
      </section>

      {/* Form */}
      <section className="flex items-center justify-center bg-background px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex items-center gap-3 lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Network className="size-5" aria-hidden />
            </span>
            <p className="font-heading text-lg font-bold">LMS Lập trình mạng</p>
          </div>
          <LoginForm />
        </div>
      </section>
    </div>
  );
}
