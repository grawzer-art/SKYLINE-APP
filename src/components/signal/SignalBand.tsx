"use client";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { signals, type Signal } from "@/data/demo";
import { useSignals } from "@/lib/useSignals";
import { SignalReveal } from "./SignalReveal";
import { cn } from "@/lib/cn";

/** Une seule annonce exclusive sur HOME : indicateur discret tant qu'une révélation n'est pas ouverte. */
export function SignalBand() {
  const { isSeen, markSeen } = useSignals();
  const [open, setOpen] = useState<Signal | null>(null);
  const featured = signals[0]; // toujours la dernière révélation publiée
  const fresh = !isSeen(featured.id);
  const launch = () => { setOpen(featured); markSeen(featured.id); };

  return (
    <>
      <button type="button" onClick={launch} aria-haspopup="dialog"
        className="group flex min-h-[5.25rem] w-full items-center justify-between gap-4 border-t border-cloud/15 bg-jet px-5 text-left transition active:bg-surface-1">
        <span className="min-w-0">
          <span className="flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.22em] text-cloud/70">
            {fresh && <span aria-hidden className="size-1.5 rounded-full bg-sunset motion-safe:animate-pulse" />}
            Skyline Signal{fresh && <span className="sr-only"> — nouvelle révélation</span>}
          </span>
          <span className="mt-1.5 block text-[1rem] font-medium leading-snug text-cloud">{fresh ? featured.teaser : featured.title}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-cloud/80">
          {fresh ? "Ouvrir" : "Revoir"} <ArrowRight size={15} strokeWidth={1.5} aria-hidden className={cn("transition group-hover:translate-x-1 motion-reduce:transition-none")} />
        </span>
      </button>
      <SignalReveal signal={open} onClose={() => setOpen(null)} />
    </>
  );
}
