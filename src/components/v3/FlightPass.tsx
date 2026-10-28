"use client";
import { Plane } from "lucide-react";
import { Emblem } from "@/components/ui/Emblem";
import { DemoTag } from "./ui";
import { MetalSurface, type useMetal } from "./metal";
import { cn } from "@/lib/cn";

export type PassStatus = "confirmed" | "pending" | "ended";
const statusText: Record<PassStatus, string> = { confirmed: "Réservation confirmée", pending: "En attente de confirmation", ended: "Édition terminée" };

/**
 * MY FLIGHT PASS : accès personnel à l'événement. Distinct de la carte membre CLUB et de la carte d'embarquement de la compagnie.
 * Aucun faux numéro, aucun faux QR : l'emplacement du QR d'accès reste vide tant que l'équipe ne le délivre pas.
 */
export function FlightPass({ name, status, metal, demo }: { name: string; status: PassStatus; metal: ReturnType<typeof useMetal>; demo?: boolean }) {
  return (
    <MetalSurface metal={metal} depth label={`Pass SKYLINE Ibiza 2027 — ${name}`} delay={0.1}>
      <div className="relative">
        <div className="flex items-start justify-between p-[1.15rem] pb-0">
          <span style={{ transform: "translate3d(calc(var(--nx,0) * -5px), calc(var(--ny,0) * -4px), 0)", transition: "transform 220ms cubic-bezier(0.22,1,0.36,1)" }}><Emblem size={46} className="[filter:drop-shadow(0_2px_3px_rgba(0,0,0,0.85))]" /></span>
          <div className="text-right font-mono uppercase">
            <p className="text-[0.7rem] tracking-[0.3em] text-silver">Skyline Pass</p>
            <p className="mt-1 text-[0.72rem] tracking-[0.22em] text-sky">Ibiza 2027</p>
          </div>
        </div>

        <div className="px-[1.15rem] pt-4">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.34em] text-silver/80">Participant</p>
          <p className="metal-text font-display mt-1.5 truncate text-[clamp(1.7rem,8.6vw,2.25rem)] uppercase leading-[1.02]" style={{ transform: "translate3d(calc(var(--nx,0) * 3px), calc(var(--ny,0) * 2px), 0)", transition: "transform 220ms cubic-bezier(0.22,1,0.36,1)" }}>{name}</p>
          <div className="mt-3.5 flex items-center gap-3 font-mono text-[0.72rem] uppercase tracking-[0.2em]">
            <span className="text-cloud/90">France</span>
            <span aria-hidden className="relative h-px flex-1 bg-gradient-to-r from-silver/60 via-sky/60 to-silver/60"><Plane size={13} strokeWidth={1.5} className="absolute left-1/2 top-1/2 size-[13px] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[#0a0c10] px-px text-sky" /></span>
            <span className="text-cloud/90">Ibiza</span>
          </div>
        </div>

        <div aria-hidden className="relative mt-4 h-px">
          <span className="absolute inset-x-5 top-0 border-t border-dashed border-silver/30" />
          <span className="absolute -left-2.5 -top-2.5 size-5 rounded-full border border-silver/35 bg-jet" />
          <span className="absolute -right-2.5 -top-2.5 size-5 rounded-full border border-silver/35 bg-jet" />
        </div>

        <div className="flex items-center justify-between gap-4 p-[1.15rem] pt-4">
          <div className="min-w-0 font-mono uppercase">
            <p className="text-[0.7rem] tracking-[0.26em] text-cloud/64">Accès</p>
            <p className="mt-1.5 flex items-center gap-2 text-[0.75rem] leading-snug tracking-[0.1em]"><span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", status === "confirmed" ? "bg-sky" : status === "ended" ? "bg-silver" : "bg-cloud/35")} />{statusText[status]}</p>
            <p className="mt-3 text-[0.7rem] tracking-[0.26em] text-cloud/64">N° de pass</p>
            <p className="mt-1.5 text-[0.75rem] tracking-[0.1em] text-cloud/68">Attribué par l&apos;équipe</p>
          </div>
          <div role="img" aria-label="Emplacement du QR code d'accès, non disponible dans le prototype" className="relative grid size-[5.4rem] shrink-0 place-items-center rounded-[4px] bg-jet/70">
            {["left-0 top-0 border-l border-t", "right-0 top-0 border-r border-t", "bottom-0 left-0 border-b border-l", "bottom-0 right-0 border-b border-r"].map((c) => <span key={c} aria-hidden className={cn("absolute size-3.5 border-sky/70", c)} />)}
            <p className="px-2 text-center leading-tight text-cloud/70"><span className="font-mono text-[0.9rem] tracking-[0.1em] text-cloud/85">QR</span><span className="mt-1 block text-[0.72rem]">à la confirmation</span></p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-silver/10 px-[1.15rem] py-2.5"><p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-cloud/60">Pas un titre de transport</p>{demo && <DemoTag />}</div>
      </div>
    </MetalSurface>
  );
}
