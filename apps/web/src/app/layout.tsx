import type { Metadata } from "next";
import { Be_Vietnam_Pro, Literata, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";

/** Serif display — chất học thuật, hỗ trợ tiếng Việt */
const literata = Literata({
  variable: "--font-heading",
  subsets: ["vietnamese", "latin"],
});

/** Sans UI — tối ưu dấu tiếng Việt */
const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-sans",
  subsets: ["vietnamese", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "LMS-P — Nền tảng quản trị học tập",
    template: "%s · LMS-P",
  },
  description:
    "Nền tảng quản trị học tập: lớp học, học liệu, bài tập, kỳ thi và chấm điểm tự động realtime.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={cn(
        "h-full antialiased",
        literata.variable,
        beVietnamPro.variable,
        geistMono.variable
      )}
    >
      <body className="min-h-full flex flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
