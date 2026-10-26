"use client";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { UpdatesFeed } from "@/components/explore/UpdatesFeed";
import { SignalList } from "@/components/signal/SignalList";
import { ExperienceSheet } from "@/components/home/ExperienceSheet";
import { DemoFooter } from "@/components/layout/DemoFooter";

/** Écran temporaire (EXPLORE éditorial à concevoir après validation de HOME) : révélations + annonces existantes. */
export default function Page() {
  const [concept, setConcept] = useState(false);
  return (
    <div className="pt-24">
      <div className="px-5">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-sky">Skyline Culture</p>
        <h1 className="font-display mt-3 text-[clamp(2rem,10vw,3.1rem)]">Explore</h1>
        <button type="button" onClick={() => setConcept(true)} aria-haspopup="dialog"
          className="mt-5 inline-flex min-h-11 items-center gap-2 border-b border-sky/70 pb-0.5 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-sky">
          Découvrir le concept <ArrowRight size={15} strokeWidth={1.5} aria-hidden />
        </button>
      </div>
      <SignalList />
      <UpdatesFeed />
      <ExperienceSheet open={concept} onClose={() => setConcept(false)} />
      <DemoFooter />
    </div>
  );
}
