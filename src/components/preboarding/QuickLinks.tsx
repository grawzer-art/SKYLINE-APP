"use client";
import { useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";

const links = [
  { target: "updates", label: "Dernières annonces", text: "Un nouvel artiste bientôt dévoilé…" },
  { target: "checklist", label: "Préparez votre voyage", text: "Check-list, bagages, informations…" },
];

/** Raccourcis vers les sections de la page (défilement doux, sans entrée d'historique). */
export function QuickLinks() {
  const reduce = useReducedMotion();
  return (
    <div className="grid grid-cols-2 gap-3 px-5 pt-3">
      {links.map((l) => (
        <a key={l.target} href={`#${l.target}`}
          onClick={(e) => { e.preventDefault(); document.getElementById(l.target)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }); }}
          className="flex min-h-[4.75rem] flex-col justify-between rounded-2xl border border-line bg-surface-1 p-3.5 transition active:scale-[0.98]">
          <span className="text-[0.62rem] font-medium uppercase tracking-[0.12em] text-cloud">{l.label}</span>
          <span className="flex items-end justify-between gap-2 text-[0.8rem] leading-snug text-dim">
            {l.text}<ArrowRight size={16} strokeWidth={1.5} className="shrink-0 text-silver" aria-hidden />
          </span>
        </a>
      ))}
    </div>
  );
}
