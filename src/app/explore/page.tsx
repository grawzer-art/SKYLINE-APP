import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Photo } from "@/components/ui/Photo";
import { images } from "@/data/demo";
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
      <div className="px-5 pt-6">
        <Link href="/v3/explore/radio" className="group relative isolate flex aspect-[16/9] items-end overflow-hidden rounded-[4px] border border-cloud/15 p-5">
          <Photo src={images.before} alt="" objectPosition="30% 75%" sizes="(max-width: 480px) 100vw, 480px" imgClassName="transition duration-1000 group-hover:scale-[1.03] motion-reduce:transition-none" />
          <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-jet via-jet/50 to-jet/10" />
          <span className="relative flex w-full items-end justify-between">
            <span><span className="block font-mono text-[0.58rem] uppercase tracking-[0.2em] text-sunset">Sélections officielles</span><span className="font-display mt-1.5 block text-[1.3rem]">Skyline Radio</span></span>
            <span className="flex items-center gap-1.5 font-mono text-[0.62rem] uppercase tracking-[0.18em]">Écouter <ArrowRight size={15} strokeWidth={1.5} aria-hidden className="transition group-hover:translate-x-1" /></span>
          </span>
        </Link>
      </div>
      <ConceptCard />
      <SignalList items={getPublishedSignals()} />
      <UpdatesFeed />
      <DemoFooter />
    </div>
  );
}
