import type { Metadata } from "next";
import { ClipboardList, Layers, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export const metadata: Metadata = { title: "Đăng nhập" };

const HIGHLIGHTS = [
  {
    icon: Layers,
    title: "Thực hành trên sandbox",
    text: "Nộp bài lập trình, chấm tự động trong môi trường cô lập.",
  },
  {
    icon: ClipboardList,
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
    <div className="relative grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      {/* Panel giới thiệu — đơn sắc đảo theo theme (đen ở light, trắng ở dark) */}
      <section className="relative hidden flex-col justify-between bg-foreground p-10 text-background lg:flex">

        <Logo size={44} caption="Học kỳ 2026–2027 · Khoa Công nghệ thông tin" />

        <div className="relative max-w-md space-y-8 py-10">
          <h1 className="font-heading text-4xl font-bold leading-tight">
            Học trực tuyến, nộp bài, kỳ thi và{" "}
            <span className="font-bold">chấm code tự động</span>
          </h1>
          <ul className="space-y-5">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title} className="flex gap-4">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-background/10 text-background">
                  <item.icon className="size-4.5" aria-hidden />
                </span>
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-background/65">{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-background/40">
          Hệ thống dành cho sinh viên, giảng viên và quản trị khoa.
        </p>
      </section>

      {/* Form */}
      <section className="flex items-center justify-center bg-background px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden">
            <Logo size={40} caption="Hệ thống quản lý học tập" />
          </div>
          <LoginForm />
        </div>
      </section>
    </div>
  );
}
