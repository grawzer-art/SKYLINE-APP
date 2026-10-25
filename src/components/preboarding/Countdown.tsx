"use client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { event } from "@/data/demo";
import { useCountdown } from "@/lib/useCountdown";
import { ease } from "@/design/motion";

const pad = (n: number) => String(n).padStart(2, "0");

function Cell({ value, label, reduce }: { value: string; label: string; reduce: boolean | null }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-9 w-full overflow-hidden text-center font-mono text-[1.95rem] font-semibold leading-9 tabular-nums">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={value} className="absolute inset-0"
            initial={reduce ? false : { y: "60%", opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { y: "-60%", opacity: 0 }} transition={{ duration: 0.3, ease }}
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="mt-1.5 text-[0.62rem] font-medium uppercase tracking-[0.14em] text-dim">{label}</span>
    </div>
  );
}

/** Module unique : quatre valeurs côte à côte, superposé au bas de la photo. */
export function Countdown() {
  const state = useCountdown(event.departureISO);
  const reduce = useReducedMotion();
  const date = new Date(event.departureISO);
  const dateLabel = Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  const labels = ["Jours", "Heures", "Minutes", "Secondes"];
  const values = state.status === "running" ? [state.days, state.hours, state.minutes, state.seconds].map(pad) : ["--", "--", "--", "--"];

  return (
    <section id="countdown" aria-labelledby="countdown-title" className="relative z-10 -mt-[4.5rem] scroll-mt-20 px-5">
      <div className="rounded-2xl border border-line bg-jet/70 p-4 backdrop-blur-md">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="countdown-title" className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-cloud">Départ dans</h2>
          {dateLabel && <span className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-dim">{dateLabel} · date fictive</span>}
        </div>

        {state.status === "past" || state.status === "invalid" ? (
          <div role="status" className="py-1">
            <p className="font-display text-lg">{state.status === "past" ? "Le vol a décollé." : "Date à confirmer."}</p>
            <p className="mt-1 text-sm text-dim">{state.status === "past" ? "The journey never ends — retrouvez la communauté dans le Club." : "La date de départ sera annoncée prochainement."}</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1" role="timer"
            aria-label={state.status === "running" ? `${state.days} jours, ${state.hours} heures, ${state.minutes} minutes` : "Chargement du compte à rebours"}>
            {labels.map((l, i) => <Cell key={l} value={values[i]} label={l} reduce={reduce} />)}
          </div>
        )}
      </div>
    </section>
  );
}
