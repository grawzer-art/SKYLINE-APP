import type { Metadata } from "next";
import { ConceptCard } from "@/components/explore/ConceptCard";
import { UpdatesFeed } from "@/components/explore/UpdatesFeed";
import { SignalList } from "@/components/signal/SignalList";
import { DemoFooter } from "@/components/layout/DemoFooter";
import { getPublishedSignals } from "@/data/signals";

export const metadata: Metadata = { title: "SKYLINE — Explore" };

/** Écran temporaire (EXPLORE éditorial à concevoir plus tard) : révélations publiées + annonces existantes. */
export default function Page() {
  return (
    <div className="pt-24">
      <div className="px-5">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-sky">Skyline Culture</p>
        <h1 className="font-display mt-3 text-[clamp(2rem,10vw,3.1rem)]">Explore</h1>
      </div>
      <ConceptCard />
      <SignalList items={getPublishedSignals()} />
      <UpdatesFeed />
      <DemoFooter />
    </div>
  );
}
