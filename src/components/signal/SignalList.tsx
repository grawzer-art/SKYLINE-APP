"use client";
import Link from "next/link";
import { formatSignalDate, signalTypeLabels, type Signal } from "@/data/signal-types";
import { Photo } from "@/components/ui/Photo";
import { rememberOpen } from "@/lib/signalNav";
import { useSignals } from "@/lib/useSignals";
import { cn } from "@/lib/cn";

/** EXPLORE : toutes les révélations publiées, de la plus récente à la plus ancienne. Toujours consultables. */
export function SignalList({ items }: { items: Signal[] }) {
  const { isSeen } = useSignals();
  return (
    <section aria-labelledby="signal-title" className="px-5 pt-10">
      <p className="font-mono text-[0.72rem] uppercase tracking-[0.22em] text-sky">Skyline Signal</p>
      <h2 id="signal-title" className="font-display mt-1.5 text-[1.15rem]">Révélations</h2>
      <ul className="mt-4 divide-y divide-line border-y border-line">
        {items.map((s) => {
          const fresh = !isSeen(s.id);
          return (
            <li key={s.id}>
              <Link href={`/signal/${s.slug}`} onClick={(e) => rememberOpen(e.currentTarget)} className="flex min-h-[4.75rem] w-full items-center gap-4 py-3">
                <span className="relative size-14 shrink-0 overflow-hidden rounded-[3px]"><Photo src={s.image.src} sizes="56px" /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.18em]">
                    <span className={signalTypeLabels[s.type].tone === "sunset" ? "text-sunset" : "text-sky"}>{signalTypeLabels[s.type].label}</span>
                    <span className="text-dim">· {formatSignalDate(s.publishedAt)}</span>
                    {s.demo && <span className="border border-cloud/25 px-1 text-cloud/68">Démo</span>}
                  </span>
                  <span className="mt-1 block text-[0.95rem] leading-snug">{s.title}</span>
                </span>
                {fresh && <span className={cn("shrink-0 border border-sky/60 px-1.5 py-0.5 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-sky")}>New<span className="sr-only"> — nouvelle révélation</span></span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
