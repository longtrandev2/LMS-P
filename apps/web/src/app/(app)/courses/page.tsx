import type { Metadata } from "next";
import { CoursesPage } from "@/components/courses/courses-page";

export const metadata: Metadata = { title: "Khóa học" };

export default function CoursesRoute() {
  return <CoursesPage />;
}
