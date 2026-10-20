import { CourseClassesPage } from "@/components/classes/course-classes-page";

export default async function CourseClassesRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CourseClassesPage courseId={id} />;
}
