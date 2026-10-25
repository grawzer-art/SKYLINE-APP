"use client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { event } from "@/data/demo";
import { useCountdown } from "@/lib/useCountdown";
import { ease } from "@/design/motion";

const pad = (n: number) => String(n).padStart(2, "0");

function Cell({ value, label, reduce }: { value: string; label: string; reduce: boolean | null }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-line bg-surface-1 px-1 py-4">
      <div className="relative h-[2.6rem] w-full overflow-hidden text-center font-mono text-[2.1rem] font-medium leading-[2.6rem] tabular-nums">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={value}
            className="absolute inset-0"
            initial={reduce ? false : { y: "70%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { y: "-70%", opacity: 0 }}
            transition={{ duration: 0.35, ease }}
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="mt-2 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-dim">{label}</span>
    </div>
  );
}

export function Countdown() {
  const state = useCountdown(event.departureISO);
  const reduce = useReducedMotion();
  const date = new Date(event.departureISO);
  const dateLabel = Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const cells =
    state.status === "running"
      ? [[state.days, "Jours"], [state.hours, "Heures"], [state.minutes, "Min"], [state.seconds, "Sec"]] as const
      : null;

  return (
    <section id="countdown" aria-labelledby="countdown-title" className="relative z-10 -mt-2 scroll-mt-24 px-5">
      <div className="flex items-baseline justify-between">
        <h2 id="countdown-title" className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-sky">Décollage dans</h2>
        <span className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-dim">{dateLabel} · fictif</span>
      </div>

      {state.status === "past" || state.status === "invalid" ? (
        <div role="status" className="mt-4 rounded-2xl border border-sunset/40 bg-sunset/10 p-6">
          <p className="font-display text-2xl">{state.status === "past" ? "Le vol a décollé." : "Date à confirmer."}</p>
          <p className="mt-2 text-sm text-dim">
            {state.status === "past" ? "The journey never ends — retrouve la communauté dans le Club." : "La date de départ sera annoncée prochainement."}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-4 gap-2" role="timer" aria-label={cells ? `${cells[0][0]} jours, ${cells[1][0]} heures, ${cells[2][0]} minutes` : "Chargement du compte à rebours"}>
            {(cells ?? ([["--", "Jours"], ["--", "Heures"], ["--", "Min"], ["--", "Sec"]] as const)).map(([v, l]) => (
              <Cell key={l} value={typeof v === "number" ? pad(v) : v} label={l} reduce={reduce} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
