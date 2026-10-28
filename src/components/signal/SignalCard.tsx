"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { signalTypeLabels, type Signal } from "@/data/signal-types";
import { Photo } from "@/components/ui/Photo";
import { rememberOpen } from "@/lib/signalNav";
import { useSignals } from "@/lib/useSignals";
import { cn } from "@/lib/cn";

/** HOME : une seule révélation prioritaire — la plus récente publiée. Photo, NEW, titre court, DÉCOUVRIR. */
export function SignalCard({ signal: s }: { signal?: Signal }) {
  const { isSeen } = useSignals();
  if (!s) return null;
  const fresh = !isSeen(s.id);
  return (
    <div className="px-5 pt-3">
      <Link href={`/signal/${s.slug}`} onClick={(e) => rememberOpen(e.currentTarget)}
        className="group relative isolate flex h-[10rem] w-full overflow-hidden rounded-[10px] border border-cloud/15 p-4 text-left transition active:scale-[0.99]">
        <Photo src={s.image.src} alt="" sizes="(max-width: 480px) 100vw, 480px" slotLabel={s.image.slot} objectPosition={s.image.position}
          imgClassName="transition duration-1000 group-hover:scale-[1.04] motion-reduce:transition-none" />
        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-jet via-jet/55 via-55% to-jet/10" />
        <span className="relative flex h-full w-full flex-col justify-between">
          <span className="flex items-center justify-between gap-3 font-mono text-[0.7rem] uppercase tracking-[0.18em]">
            <span className="text-cloud/80">Signal</span>
            <span className="flex items-center gap-1.5">
              {fresh && <span className="inline-flex items-center gap-1.5 border border-sky/60 px-1.5 py-0.5 text-sky"><span aria-hidden className="size-1 rounded-full bg-sky motion-safe:animate-pulse" />New<span className="sr-only"> — nouvelle révélation</span></span>}
            </span>
          </span>
          <span className="flex items-end justify-between gap-4">
            <span className="block max-w-[21ch]">
              <span className={cn("block font-mono text-[0.7rem] uppercase tracking-[0.2em]", signalTypeLabels[s.type].tone === "sunset" ? "text-sunset" : "text-sky")}>{signalTypeLabels[s.type].label}</span>
              <span className="font-display mt-1 block text-[1.15rem] leading-[1.08]">{s.title}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5 pb-0.5 font-mono text-[0.72rem] uppercase tracking-[0.18em] text-cloud">
              {fresh ? "Découvrir" : "Revoir"} <ArrowRight size={15} strokeWidth={1.5} aria-hidden className="transition group-hover:translate-x-1 motion-reduce:transition-none" />
            </span>
          </span>
        </span>
      </Link>
    </div>
  );
}
