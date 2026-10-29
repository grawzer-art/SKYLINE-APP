"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { countByStatus, isOverdue } from "@/domain/missions";
import { useActor } from "@/lib/useActor";
import { useClock } from "@/lib/useClock";
import { useMissions } from "@/lib/useMissions";

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** HQ → MISSIONS : aperçu de MES missions (stockage local de cet appareil). Pas d'onglet supplémentaire : l'accès passe par HQ. */
export function MissionsGlance() {
  const who = useActor(); const { missions } = useMissions(); const clock = useClock();
  const mine = who.status === "ok" ? missions.filter((m) => m.assigneeId === who.actor.memberId) : [];
  const c = countByStatus(mine); const today = clock ? iso(new Date(clock)) : null; const late = mine.filter((m) => isOverdue(m, today)).length;
  return (
    <section className="px-5 pt-8">
      <Link href="/staff/missions" className="group block rounded-[12px] border border-sky/50 bg-surface-1 p-5 transition active:scale-[0.99]">
        <span className="flex items-center justify-between"><span className="font-mono text-[0.75rem] uppercase tracking-[0.22em] text-sky">Missions</span><ArrowRight size={18} strokeWidth={1.5} aria-hidden className="text-silver transition group-hover:translate-x-1" /></span>
        <span className="mt-3 block font-display text-[1.6rem] leading-tight">{who.status !== "ok" ? "Mes missions" : mine.length === 0 ? "Aucune mission en cours" : `${c.todo + c.in_progress + c.review} à suivre`}</span>
        {mine.length > 0 && <span className="mt-2 block text-[0.92rem] text-cloud/80">{c.todo} à faire · {c.in_progress} en cours{c.review ? ` · ${c.review} en validation` : ""}{late ? <span className="text-sunset"> · {late} en retard</span> : null}</span>}
      </Link>
    </section>
  );
}
