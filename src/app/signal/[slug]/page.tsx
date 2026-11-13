import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SignalExperience } from "@/components/signal/SignalExperience";
import { getPublishedSignals, getSignalBySlug } from "@/data/signals";

/** Seuls les Signaux publiés sont générés ; un brouillon ou un slug inconnu renvoie une 404. */
export function generateStaticParams() {
  // Cache Components exige au moins un résultat. Sans Signal publié (cas normal tant qu'aucun contenu officiel n'existe), on génère un paramètre
  // réservé qui ne correspond à aucun Signal : la page répond 404 comme pour n'importe quel slug inconnu.
  const slugs = getPublishedSignals().map((s) => ({ slug: s.slug }));
  return slugs.length > 0 ? slugs : [{ slug: "aucun-signal-publie" }];
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
