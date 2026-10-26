import { notFound } from "next/navigation";
import { V3Selection } from "@/components/v3/V3RadioDetail";
import { radio } from "@/data/v3";

export function generateStaticParams() { return radio.selections.map((s) => ({ id: s.id })); }
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!radio.selections.some((s) => s.id === id)) notFound();
  return <V3Selection id={id} />;
}
