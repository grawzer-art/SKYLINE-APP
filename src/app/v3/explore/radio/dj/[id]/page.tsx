import { notFound } from "next/navigation";
import { V3Dj } from "@/components/v3/V3RadioDetail";
import { radio } from "@/data/v3";

export function generateStaticParams() { return radio.djs.map((d) => ({ id: d.id })); }
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!radio.djs.some((d) => d.id === id)) notFound();
  return <V3Dj id={id} />;
}
