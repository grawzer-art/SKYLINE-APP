import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Photo } from "@/components/ui/Photo";
import { images } from "@/data/demo";
import { ConceptCard } from "@/components/explore/ConceptCard";
import { UpdatesFeed } from "@/components/explore/UpdatesFeed";
import { SignalList } from "@/components/signal/SignalList";
import { DemoFooter } from "@/components/layout/DemoFooter";
import { visuals } from "@/data/visuals";
import { getPublishedSignals } from "@/data/signals";

export const metadata: Metadata = { title: "SKYLINE — Explore" };

/** EXPLORE : Skyline Radio à la une, souvenirs, programmation (état d'attente), révélations publiées et annonces. */
export default function Page() {
  return (
    <div className="pt-24">
      <div className="px-5">
        <p className="font-mono text-[0.75rem] uppercase tracking-[0.22em] text-sky">Skyline Culture</p>
        <h1 className="font-display mt-3 text-[clamp(2.2rem,11vw,3.3rem)] leading-[0.92]">Explore</h1>
        <p className="mt-3 max-w-[32ch] text-[1.02rem] leading-snug text-cloud/80">Musique, révélations et souvenirs d&apos;Ibiza 2027.</p>
      </div>
      <div className="px-5 pt-6">
        <Link href="/v3/explore/sound" className="group relative isolate flex aspect-[5/4] items-end overflow-hidden rounded-[10px] border border-cloud/15 p-5">
          <Photo src={images.before} alt="" objectPosition="30% 70%" sizes="(max-width: 480px) 100vw, 480px" imgClassName="transition duration-1000 group-hover:scale-[1.03] motion-reduce:transition-none" />
          <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-jet via-jet/45 to-jet/5" />
          <span className="relative flex w-full items-end justify-between gap-4">
            <span><span className="block font-mono text-[0.75rem] uppercase tracking-[0.2em] text-sunset">Collections musicales</span><span className="font-display mt-2 block text-[1.8rem] leading-none">Skyline Sound</span></span>
            <span className="grid size-14 shrink-0 place-items-center rounded-full bg-cloud text-jet transition group-active:scale-95"><ArrowRight size={20} strokeWidth={1.75} aria-label="Ouvrir Skyline Sound" /></span>
          </span>
        </Link>
      </div>
      <div className="px-5 pt-3">
        <Link href="/v3/club/memories" className="group flex h-[4.75rem] items-stretch overflow-hidden rounded-[8px] border border-cloud/10 bg-surface-1 transition active:scale-[0.99]">
          <span className="relative block w-[4.75rem] shrink-0"><Photo src={visuals.warm} alt="" sizes="76px" /></span>
          <span className="flex min-w-0 flex-1 flex-col justify-center px-4"><span className="font-display text-[1rem] leading-none">Souvenirs</span><span className="mt-1.5 text-[0.85rem] text-dim">Archives officielles des éditions</span></span>
          <span className="flex items-center pr-4"><ArrowRight size={16} strokeWidth={1.5} aria-hidden className="text-silver" /></span>
        </Link>
      </div>
      <section className="px-5 pt-9" aria-labelledby="lineup-title">
        <p className="font-mono text-[0.75rem] uppercase tracking-[0.22em] text-sky">Line-up</p>
        <h2 id="lineup-title" className="font-display mt-2 text-[1.4rem]">Programmation</h2>
        <p role="status" className="mt-3 max-w-[34ch] border-l border-sky pl-4 text-[1rem] font-light leading-snug text-cloud/85">Les artistes seront dévoilés ici, un à un, dès qu&apos;ils seront confirmés.</p>
      </section>
      <ConceptCard />
      <SignalList items={getPublishedSignals()} />
      <UpdatesFeed />
      <DemoFooter />
    </div>
  );
}
