import { MyClassMaterialsPage } from "@/components/me/my-class-materials-page";

export default async function MyClassRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MyClassMaterialsPage classId={id} />;
}
