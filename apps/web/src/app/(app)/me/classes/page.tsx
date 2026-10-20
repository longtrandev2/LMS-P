import type { Metadata } from "next";
import { MyClassesPage } from "@/components/me/my-classes-page";

export const metadata: Metadata = { title: "Lớp của tôi" };

export default function MyClassesRoute() {
  return <MyClassesPage />;
}
