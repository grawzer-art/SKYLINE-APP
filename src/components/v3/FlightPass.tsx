"use client";
import { Plane } from "lucide-react";
import { Emblem } from "@/components/ui/Emblem";
import { DemoTag } from "./ui";
import { MetalSurface, TiltButton, type useMetal } from "./metal";
import { FitName } from "./FitName";
import { cn } from "@/lib/cn";

/** `to_confirm` : aucune donnée de réservation réelle n'est encore reliée au compte → « à confirmer » (jamais présenté comme confirmé). */
export type PassStatus = "confirmed" | "pending" | "ended" | "to_confirm" | "verified";
const statusText: Record<PassStatus, string> = { confirmed: "Réservation confirmée", pending: "En attente de confirmation", ended: "Édition terminée", to_confirm: "Réservation à confirmer", verified: "Réservation vérifiée" };

/**
 * MY FLIGHT PASS : accès personnel à l'événement. Distinct de la carte membre CLUB et de la carte d'embarquement de la compagnie.
 * Aucun faux numéro, aucun faux QR : aucun cadre ni emplacement de QR n'est affiché tant que l'équipe ne délivre pas de code d'accès — y compris pour une réservation VÉRIFIÉE
 * (« verified » = preuve serveur d'une réservation ; le QR exigera un jeton signé côté serveur, pas encore émis).
 */
export function FlightPass({ name, status, metal, demo, origin = "France" }: { name: string; status: PassStatus; metal: ReturnType<typeof useMetal>; demo?: boolean; /** Point de départ : jamais inventé hors revue (« À confirmer »). */ origin?: string }) {
  return (
    <MetalSurface metal={metal} depth label={`Pass SKYLINE Ibiza 2027 — ${name}`} delay={0.1}>
      <div className="relative">
        <div className="flex items-start justify-between p-5 pb-0">
          <span style={{ transform: "translate3d(calc(var(--nx,0) * -5px), calc(var(--ny,0) * -4px), 0)", transition: "transform 220ms cubic-bezier(0.22,1,0.36,1)" }}><Emblem size={54} className="[filter:drop-shadow(0_2px_3px_rgba(0,0,0,0.85))]" /></span>
          <div className="text-right font-mono uppercase">
            <p className="text-[0.7rem] tracking-[0.3em] text-silver">Skyline Pass</p>
            <p className="mt-1 text-[0.72rem] tracking-[0.22em] text-sky">Ibiza 2027</p>
          </div>
        </div>

        <div className="px-5 pt-7">
          <FitName name={name} max="2.8rem" min="1.3rem" gutter="5.25rem" className="metal-text font-display uppercase leading-[1.04]" style={{ transform: "translate3d(calc(var(--nx,0) * 3px), calc(var(--ny,0) * 2px), 0)", transition: "transform 220ms cubic-bezier(0.22,1,0.36,1)" }} />
          <div className="mt-5 flex items-center gap-3 font-mono text-[0.78rem] uppercase tracking-[0.2em]">
            <span className="text-cloud/90">{origin}</span>
            <span aria-hidden className="relative h-px flex-1 bg-gradient-to-r from-silver/60 via-sky/60 to-silver/60"><Plane size={13} strokeWidth={1.5} className="absolute left-1/2 top-1/2 size-[13px] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[#0a0c10] px-px text-sky" /></span>
            <span className="text-cloud/90">Ibiza</span>
          </div>
        </div>

        <div aria-hidden className="relative mt-6 h-px">
          <span className="absolute inset-x-5 top-0 border-t border-dashed border-silver/30" />
          <span className="absolute -left-2.5 -top-2.5 size-5 rounded-full border border-silver/35 bg-jet" />
          <span className="absolute -right-2.5 -top-2.5 size-5 rounded-full border border-silver/35 bg-jet" />
        </div>

        <div className="flex items-center justify-between gap-4 p-5 pt-6">
          <p className="flex min-w-0 items-center gap-2.5 font-mono text-[0.85rem] uppercase leading-snug tracking-[0.1em]"><span aria-hidden className={cn("size-2 shrink-0 rounded-full", status === "confirmed" || status === "verified" ? "bg-sky" : status === "ended" ? "bg-silver" : "bg-cloud/35")} />{statusText[status]}</p>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-silver/10 px-5 py-3"><p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-cloud/60">Pas un titre de transport</p><span className="flex items-center gap-2">{demo && <DemoTag />}<TiltButton metal={metal} /></span></div>
      </div>
    </MetalSurface>
  );
}
