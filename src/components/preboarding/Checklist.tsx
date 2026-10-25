"use client";
import { motion, useReducedMotion } from "motion/react";
import { checklist } from "@/data/demo";
import { Icon } from "@/components/ui/Icon";
import { Section } from "@/components/ui/Section";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { cn } from "@/lib/cn";
import { ease } from "@/design/motion";

const KEY = "skyline.demo.checklist.v1";

export function Checklist() {
  const [done, setDone] = useLocalStorage<string[]>(KEY, []);
  const reduce = useReducedMotion();
  const valid = done.filter((id) => checklist.some((c) => c.id === id)); // ignore d'anciens ids
  const pct = Math.round((valid.length / checklist.length) * 100);
  const toggle = (id: string) => setDone(valid.includes(id) ? valid.filter((d) => d !== id) : [...valid, id]);

  return (
    <Section id="checklist" eyebrow="Travel Checklist" title="Prêt au décollage ?"
      action={valid.length > 0 ? (
        <button type="button" onClick={() => setDone([])} className="min-h-11 px-1 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-dim underline-offset-4 hover:text-cloud hover:underline">
          Réinitialiser
        </button>
      ) : undefined}>
      <div className="rounded-2xl border border-line bg-surface-1 p-4">
        <div className="flex items-baseline justify-between font-mono text-[0.72rem] uppercase tracking-[0.16em]">
          <span className="text-dim">Progression</span>
          <span aria-hidden>{valid.length}/{checklist.length} · {pct}%</span>
        </div>
        <div role="progressbar" aria-label="Progression de la checklist" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-cloud/10">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-sky to-sunset" initial={false}
            animate={{ width: `${pct}%` }} transition={reduce ? { duration: 0 } : { duration: 0.6, ease }} />
        </div>
        <p className="mt-3 text-sm text-dim" aria-live="polite">
          {pct === 100 ? "Tout est prêt. Bon vol ! ✈" : `${checklist.length - valid.length} étape${checklist.length - valid.length > 1 ? "s" : ""} restante${checklist.length - valid.length > 1 ? "s" : ""}.`}
        </p>
      </div>

      <ul className="mt-3 space-y-2">
        {checklist.map((c) => {
          const on = valid.includes(c.id);
          return (
            <li key={c.id}>
              <label className={cn("flex min-h-14 cursor-pointer items-center gap-4 rounded-2xl border p-4 transition active:scale-[0.99]",
                on ? "border-sky/40 bg-sky/10" : "border-line bg-surface-1 hover:bg-surface-2")}>
                <input type="checkbox" checked={on} onChange={() => toggle(c.id)} className="peer sr-only" />
                <span aria-hidden className={cn("grid size-7 shrink-0 place-items-center rounded-full border transition peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sky",
                  on ? "border-sky bg-sky text-jet" : "border-silver/60")}>
                  {on && <motion.span initial={reduce ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.25, ease }}><Icon name="check" size={16} strokeWidth={2.5} /></motion.span>}
                </span>
                <span className="min-w-0">
                  <span className={cn("block text-[0.98rem] transition", on && "text-dim line-through decoration-cloud/30")}>{c.label}</span>
                  <span className="mt-0.5 block text-xs text-dim">{c.hint}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-dim">Sauvegarde locale temporaire (ce navigateur uniquement) — démonstration.</p>
    </Section>
  );
}
