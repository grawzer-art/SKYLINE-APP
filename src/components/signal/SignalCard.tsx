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
    <div className="px-5 pt-7">
      <Link href={`/signal/${s.slug}`} onClick={(e) => rememberOpen(e.currentTarget)}
        className="group relative isolate flex h-[9.5rem] w-full overflow-hidden rounded-[12px] p-5 text-left transition active:scale-[0.99]">
        <Photo src={s.image.src} alt="" sizes="(max-width: 480px) 100vw, 480px" slotLabel={s.image.slot} objectPosition={s.image.position}
          imgClassName="transition duration-1000 group-hover:scale-[1.04] motion-reduce:transition-none" />
        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-jet via-jet/55 via-55% to-jet/10" />
        <span className="relative flex h-full w-full items-end justify-between gap-4">
          <span className="block max-w-[22ch]">
            <span className={cn("flex items-center gap-2 font-mono text-[0.72rem] uppercase tracking-[0.2em]", signalTypeLabels[s.type].tone === "sunset" ? "text-sunset" : "text-sky")}>
              {fresh && <span aria-hidden className="size-1.5 rounded-full bg-sky motion-safe:animate-pulse" />}{signalTypeLabels[s.type].label}{fresh && <span className="sr-only"> — nouvelle révélation</span>}
            </span>
            <span className="font-display mt-1.5 block text-[1.2rem] leading-[1.08]">{s.title}</span>
          </span>
          <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full border border-cloud/40"><ArrowRight size={17} strokeWidth={1.5} className="transition group-hover:translate-x-0.5 motion-reduce:transition-none" /></span>
        </span>
      </Link>
    </div>
  );
}
