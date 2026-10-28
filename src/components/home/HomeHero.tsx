"use client";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { PLACEHOLDER_PHOTOS, event, images, user } from "@/data/demo";
import { Photo } from "@/components/ui/Photo";
import { ease } from "@/design/motion";
import { useCountdown } from "@/lib/useCountdown";
import { useEventPhase, type EventPhase } from "@/lib/useEventPhase";
import { cn } from "@/lib/cn";

/** Ambiance par phase : avant = aérien/bleu, pendant = solaire/orangé, après = intime/club. */
const phases: Record<EventPhase, {
  eyebrow: string; lines: string[]; accentLine: number; accent: string; image: string; objectPos: string;
  cta: { label: string; href: string }; countdown: "departure" | "end" | null; countdownLabel?: string;
}> = {
  before: {
    eyebrow: "Pre-boarding", lines: ["La fête", "commence", "à 10 000", "mètres."], accentLine: 2, accent: "text-sky",
    image: images.before, objectPos: "30% 100%", cta: { label: "My Flight", href: "/flight" }, countdown: "departure", countdownLabel: "Départ dans",
  },
  during: {
    eyebrow: "En cours à Ibiza", lines: ["Bienvenue", "à Ibiza."], accentLine: 1, accent: "text-sunset",
    image: images.during, objectPos: "50% 40%", cta: { label: "My Flight", href: "/flight" }, countdown: "end", countdownLabel: "Fin dans",
  },
  after: {
    eyebrow: "SKYLINE Club", lines: ["The journey", "never ends."], accentLine: 1, accent: "text-silver",
    image: images.after, objectPos: "50% 30%", cta: { label: "Mon Club", href: "/club" }, countdown: null,
  },
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Countdown discret : une ligne mono, sans carte. N'apparaît que s'il a du sens. */
function QuietCountdown({ target, label }: { target: string; label: string }) {
  const s = useCountdown(target);
  if (s.status === "invalid" || s.status === "past") return null;
  const parts = s.status === "running"
    ? [[String(s.days), "J"], [pad(s.hours), "H"], [pad(s.minutes), "M"], [pad(s.seconds), "S"]] : [["–", "J"], ["–", "H"], ["–", "M"], ["–", "S"]];
  return (
    <div role="timer" aria-label={s.status === "running" ? `${label} ${s.days} jours, ${s.hours} heures, ${s.minutes} minutes` : label}>
      <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-cloud/72">{label}</p>
      <p className="mt-1.5 flex items-baseline gap-2.5 font-mono text-[1.2rem] tabular-nums text-cloud">
        {parts.map(([v, u]) => <span key={u}>{v}<span className="ml-0.5 text-[0.72rem] text-cloud/68">{u}</span></span>)}
      </p>
    </div>
  );
}

export function HomeHero() {
  const reduce = useReducedMotion();
  const phase = useEventPhase(event.departureISO, event.endISO);
  const cfg = phases[phase];
  const rise = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 22 }, animate: { opacity: 1, y: 0 },
    transition: { duration: 0.9, ease, delay },
  } as const);

  return (
    <section aria-labelledby="home-title"
      className="relative isolate flex min-h-[calc(100svh-var(--nav-h)-var(--safe-bottom)-15rem)] flex-col justify-between overflow-hidden pb-9 pt-[calc(var(--safe-top)+4.5rem)]">
      {/* Photographie : révélation lente à l'arrivée ; changement d'ambiance par phase */}
      <motion.div key={phase} className="absolute inset-0 -z-10" initial={reduce ? false : { opacity: 0, scale: 1.08 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.6, ease }}>
        <Photo src={cfg.image} priority provisional={PLACEHOLDER_PHOTOS} alt="" tagClassName="top-[calc(var(--safe-top)+4rem)]" objectPosition={cfg.objectPos} />
        <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-jet/65 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-jet/95 via-jet/45 via-55% to-transparent" />
      </motion.div>

      {/* Identité membre — discrète, façon étiquette */}
      <motion.div {...rise(0.2)} className="px-5">
        <p className="font-display text-[1.1rem] leading-tight">{user.fullName}
        </p>
      </motion.div>


      <div className="px-5 [text-shadow:0_1px_16px_rgb(0_0_0/0.7)]">
        <motion.p {...rise(0.3)} className={cn("font-mono text-[0.72rem] uppercase tracking-[0.22em]", phase === "before" ? "text-cloud/90" : cfg.accent)}>{cfg.eyebrow}</motion.p>
        <motion.h1 id="home-title" {...rise(0.42)} className="font-display mt-5 text-[clamp(2rem,10vw,2.9rem)] leading-[0.95] text-cloud">
          {cfg.lines.map((l, i) => <span key={l} className={cn("block", i === cfg.accentLine && cfg.accent)}>{l}</span>)}
        </motion.h1>

        <motion.div {...rise(0.6)} className="mt-10 flex items-end justify-between gap-4 border-t border-cloud/20 pt-5">
          {cfg.countdown ? (
            <QuietCountdown target={cfg.countdown === "end" ? event.endISO : event.departureISO} label={cfg.countdownLabel ?? ""} />
          ) : <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-cloud/72">Édition {event.year}</p>}
          <Link href={cfg.cta.href}
            className="group inline-flex min-h-12 shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-cloud px-4 font-mono text-[0.75rem] uppercase tracking-[0.1em] text-jet transition active:scale-[0.97]">
            {cfg.cta.label} <ArrowRight size={15} strokeWidth={1.5} aria-hidden className="transition group-hover:translate-x-1 motion-reduce:transition-none" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
