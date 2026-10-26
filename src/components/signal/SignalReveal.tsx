"use client";
import { motion, useReducedMotion } from "motion/react";
import { PLACEHOLDER_PHOTOS, type Signal } from "@/data/demo";
import { Photo } from "@/components/ui/Photo";
import { Sheet } from "@/components/ui/Sheet";
import { ease } from "@/design/motion";
import { cn } from "@/lib/cn";

/** SKYLINE SIGNAL — révélation privée en plein écran. Le contenu reste consultable ensuite. */
export function SignalReveal({ signal, onClose }: { signal: Signal | null; onClose: () => void }) {
  const reduce = useReducedMotion();
  const rise = (d: number) => ({ initial: reduce ? false : { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, ease, delay: 0.45 + d } } as const);
  const tone = signal?.tone === "sunset" ? "text-sunset" : "text-sky";
  return (
    <Sheet variant="immersive" open={!!signal} onClose={onClose} title={signal ? `SKYLINE SIGNAL — ${signal.title}` : ""}>
      {signal && (
        <article className="flex min-h-full flex-col">
          <div className="relative h-[52dvh] shrink-0">
            <Photo slotLabel={signal.mediaSlot} provisional={PLACEHOLDER_PHOTOS} />
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-jet to-transparent" />
          </div>
          <div className="px-5 pb-[max(2rem,var(--safe-bottom))]">
            <motion.p {...rise(0)} className={cn("font-mono text-[0.64rem] uppercase tracking-[0.22em]", tone)}>Skyline Signal · {signal.kindLabel} · {signal.date}</motion.p>
            <motion.h2 {...rise(0.08)} className="font-display mt-4 text-[clamp(1.7rem,8.4vw,2.4rem)]">{signal.title}</motion.h2>
            <motion.div {...rise(0.16)} className="mt-5 space-y-3 text-[0.95rem] leading-relaxed text-cloud/80">
              {signal.body.map((b, i) => <p key={i}>{b}</p>)}
            </motion.div>
          </div>
        </article>
      )}
    </Sheet>
  );
}
