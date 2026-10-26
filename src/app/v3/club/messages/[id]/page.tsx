import { V3Chat } from "@/components/v3/V3Chat";
import { members } from "@/data/v3";

export function generateStaticParams() { return members.filter((m) => m.visible).map((m) => ({ id: m.id })); }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <V3Chat id={id} />;
}
