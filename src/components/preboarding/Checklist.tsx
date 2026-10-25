"use client";
import { motion, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";
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
    <Section id="checklist" eyebrow="Travel Checklist" title="Préparez votre voyage"
      action={valid.length > 0 ? (
        <button type="button" onClick={() => setDone([])} className="min-h-11 px-1 text-[0.7rem] font-medium uppercase tracking-[0.12em] text-dim underline-offset-4 hover:text-cloud hover:underline">
          Réinitialiser
        </button>
      ) : undefined}>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface-1">
        <div className="px-4 pb-3 pt-4">
          <div className="flex items-center gap-3">
            <div role="progressbar" aria-label="Progression de la checklist" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}
              className="h-1 flex-1 overflow-hidden rounded-full bg-cloud/10">
              <motion.div className="h-full rounded-full bg-sky" initial={false}
                animate={{ width: `${pct}%` }} transition={reduce ? { duration: 0 } : { duration: 0.5, ease }} />
            </div>
            <span aria-hidden className="font-mono text-[0.72rem] text-cloud">{valid.length}/{checklist.length}</span>
          </div>
          <p className="sr-only" aria-live="polite">{valid.length} étapes sur {checklist.length} terminées</p>
        </div>

        <ul className="divide-y divide-line border-t border-line">
          {checklist.map((c) => {
            const on = valid.includes(c.id);
            return (
              <li key={c.id}>
                <label className="flex min-h-[3.25rem] cursor-pointer items-center gap-3.5 px-4 transition active:bg-cloud/5">
                  <input type="checkbox" checked={on} onChange={() => toggle(c.id)} className="peer sr-only" />
                  <Icon name={c.icon} size={20} className={cn("shrink-0 transition-colors", on ? "text-sky" : "text-silver/80")} />
                  <span className={cn("flex-1 text-[0.92rem] transition-colors", on && "text-dim")}>{c.label}</span>
                  <span aria-hidden className={cn("grid size-[22px] shrink-0 place-items-center rounded-md border transition peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sky",
                    on ? "border-sky bg-sky text-jet" : "border-silver/50")}>
                    {on && <motion.span initial={reduce ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.2, ease }}><Check size={14} strokeWidth={3} /></motion.span>}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="mt-3 text-[0.7rem] leading-relaxed text-dim">Aide-mémoire personnel, enregistré sur cet appareil (démo). Il ne vaut pas validation de vos documents de voyage.</p>
    </Section>
  );
}
