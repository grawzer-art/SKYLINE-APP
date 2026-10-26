import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SignalExperience } from "@/components/signal/SignalExperience";
import { getPublishedSignals, getSignalBySlug } from "@/data/signals";

/** Seuls les Signaux publiés sont générés ; un brouillon ou un slug inconnu renvoie une 404. */
export function generateStaticParams() {
  return getPublishedSignals().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const s = getSignalBySlug(slug);
  if (!s) notFound(); // brouillon ou slug inconnu
  return { title: `SKYLINE SIGNAL — ${s.title}` };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const signal = getSignalBySlug(slug);
  if (!signal) notFound();
  return <SignalExperience signal={signal} />;
}
