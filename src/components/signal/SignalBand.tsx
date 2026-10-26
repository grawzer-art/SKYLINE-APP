"use client";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { FEATURED_SIGNAL_ID, signals, type Signal } from "@/data/demo";
import { Photo } from "@/components/ui/Photo";
import { useSignals } from "@/lib/useSignals";
import { SignalReveal } from "./SignalReveal";
import { cn } from "@/lib/cn";

/** SKYLINE SIGNAL sur HOME : une carte éditoriale (photo, titre court, « Nouveau », « Découvrir »). */
export function SignalBand() {
  const { isSeen, markSeen } = useSignals();
  const [open, setOpen] = useState<Signal | null>(null);
  const [origin, setOrigin] = useState<{ x: number; y: number } | undefined>();
  const featured = signals.find((s) => s.id === FEATURED_SIGNAL_ID) ?? signals[0];
  const fresh = !isSeen(featured.id);

  const launch = (e: React.MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setOrigin({ x: r.left + r.width / 2, y: r.top + r.height / 2 }); // part du centre de la carte (clavier compris)
    setOpen(featured); markSeen(featured.id);
  };

  return (
    <>
      <div className="px-5 pt-3">
        <button type="button" onClick={launch} aria-haspopup="dialog"
          className="group relative isolate flex h-[8.75rem] w-full overflow-hidden rounded-[4px] border border-cloud/15 p-4 text-left transition active:scale-[0.99]">
          <Photo src={featured.media} alt="" sizes="(max-width: 480px) 100vw, 480px" slotLabel={featured.mediaSlot}
            imgClassName="transition duration-1000 group-hover:scale-[1.04] motion-reduce:transition-none" objectPosition="50% 55%" />
          <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-jet via-jet/55 via-55% to-jet/10" />
          <span className="relative flex h-full w-full flex-col justify-between">
            <span className="flex items-center justify-between gap-3 font-mono text-[0.58rem] uppercase tracking-[0.18em]">
              <span className="text-cloud/80">Skyline Signal</span>
              <span className="flex items-center gap-1.5">
                {fresh && <span className="inline-flex items-center gap-1.5 border border-sky/60 px-1.5 py-0.5 text-sky"><span aria-hidden className="size-1 rounded-full bg-sky motion-safe:animate-pulse" />Nouveau<span className="sr-only"> — nouvelle révélation</span></span>}
                <span className="border border-cloud/30 px-1.5 py-0.5 text-cloud/60">Démo</span>
              </span>
            </span>
            <span className="flex items-end justify-between gap-4">
              <span className="font-display block max-w-[16ch] text-[1.02rem] leading-[1.08]">{featured.title}</span>
              <span className="flex shrink-0 items-center gap-1.5 pb-0.5 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-cloud">
                {fresh ? "Découvrir" : "Revoir"} <ArrowRight size={15} strokeWidth={1.5} aria-hidden className={cn("transition group-hover:translate-x-1 motion-reduce:transition-none")} />
              </span>
            </span>
          </span>
        </button>
      </div>
      <SignalReveal signal={open} origin={origin} onClose={() => setOpen(null)} />
    </>
  );
}
