import { ClassDetailPage } from "@/components/classes/class-detail-page";

export default async function ClassDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ClassDetailPage classId={id} />;
}
