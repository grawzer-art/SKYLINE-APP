"use client";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { UpdatesFeed } from "@/components/explore/UpdatesFeed";
import { SignalList } from "@/components/signal/SignalList";
import { ExperienceSheet } from "@/components/home/ExperienceSheet";
import { Photo } from "@/components/ui/Photo";
import { experience } from "@/data/demo";
import { DemoFooter } from "@/components/layout/DemoFooter";

/** Écran temporaire (EXPLORE éditorial à concevoir après validation de HOME) : révélations + annonces existantes. */
export default function Page() {
  const [concept, setConcept] = useState(false);
  return (
    <div className="pt-24">
      <div className="px-5">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-sky">Skyline Culture</p>
        <h1 className="font-display mt-3 text-[clamp(2rem,10vw,3.1rem)]">Explore</h1>
      </div>
      <div className="px-5 pt-6">
        <button type="button" onClick={() => setConcept(true)} aria-haspopup="dialog"
          className="group relative isolate block aspect-[4/5] w-full overflow-hidden rounded-[4px] text-left">
          <Photo src={experience.image} alt="" objectPosition="50% 40%" imgClassName="transition duration-1000 group-hover:scale-[1.03] motion-reduce:transition-none" />
          <span className="absolute inset-0 bg-gradient-to-t from-jet via-jet/40 via-40% to-transparent" />
          <span className="absolute inset-x-0 bottom-0 block p-5">
            <span className="block font-mono text-[0.6rem] uppercase tracking-[0.22em] text-cloud/80">{experience.eyebrow}</span>
            <span className="font-display mt-2 block text-[1.5rem]">{experience.title}</span>
            <span className="mt-3 inline-flex min-h-11 items-center gap-2 border-b border-sky/70 pb-0.5 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-sky">
              {experience.cta} <ArrowRight size={15} strokeWidth={1.5} aria-hidden />
            </span>
          </span>
        </button>
      </div>
      <SignalList />
      <UpdatesFeed />
      <ExperienceSheet open={concept} onClose={() => setConcept(false)} />
      <DemoFooter />
    </div>
  );
}
