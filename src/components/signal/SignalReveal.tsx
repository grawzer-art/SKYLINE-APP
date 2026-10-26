"use client";
import { motion, useReducedMotion } from "motion/react";
import { type Signal } from "@/data/demo";
import { Photo } from "@/components/ui/Photo";
import { Sheet } from "@/components/ui/Sheet";
import { ease } from "@/design/motion";
import { cn } from "@/lib/cn";

/**
 * SKYLINE SIGNAL — révélation privée en plein écran : photo officielle plein cadre (lent zoom arrière),
 * titre et contenu en fondu échelonné. Sans média officiel, un emplacement identifié remplace l'image.
 */
export function SignalReveal({ signal, origin, onClose }: { signal: Signal | null; origin?: { x: number; y: number }; onClose: () => void }) {
  const reduce = useReducedMotion();
  const rise = (d: number) => ({ initial: reduce ? false : { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, ease, delay: 0.55 + d } } as const);
  const tone = signal?.tone === "sunset" ? "text-sunset" : "text-sky";
  return (
    <Sheet variant="immersive" open={!!signal} onClose={onClose} origin={origin} title={signal ? `SKYLINE SIGNAL — ${signal.title}` : ""}>
      {signal && (
        <article className="relative isolate flex min-h-full flex-col justify-end">
          <motion.div className="absolute inset-0 -z-10" initial={reduce ? false : { scale: 1.14 }} animate={{ scale: 1 }} transition={{ duration: 2.4, ease }}>
            <Photo src={signal.media} alt="" slotLabel={signal.mediaSlot} priority />
          </motion.div>
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-jet via-jet/70 via-35% to-jet/25" />
          <div className="px-5 pb-[max(2rem,calc(var(--safe-bottom)+1rem))] pt-40">
            <motion.p {...rise(0)} className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.62rem] uppercase tracking-[0.2em]", tone)}>
              <span>Skyline Signal · {signal.kindLabel}</span>
              <span className="border border-cloud/30 px-1.5 py-0.5 text-cloud/75">Démo</span>
            </motion.p>
            <motion.h2 {...rise(0.1)} className="font-display mt-4 text-[clamp(1.6rem,7.6vw,2.2rem)]">{signal.title}</motion.h2>
            <motion.div {...rise(0.2)} className="mt-4 max-w-[38ch] space-y-3 text-[0.95rem] leading-relaxed text-cloud/85">
              {signal.body.map((b, i) => <p key={i}>{b}</p>)}
            </motion.div>
            <motion.p {...rise(0.3)} className="mt-6 font-mono text-[0.56rem] uppercase tracking-[0.2em] text-cloud/50">{signal.date} · Reste consultable dans Explore</motion.p>
          </div>
        </article>
      )}
    </Sheet>
  );
}
