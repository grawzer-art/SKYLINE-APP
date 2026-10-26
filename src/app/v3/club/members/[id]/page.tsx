import { V3Member } from "@/components/v3/V3Member";
import { members } from "@/data/v3";

export function generateStaticParams() { return members.map((m) => ({ id: m.id })); }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <V3Member id={id} />;
}
