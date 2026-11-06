"use client";
import Link from "next/link";
import { StaffSection, StaffTitle } from "../ui";
import { useActor } from "@/lib/useActor";
import { useMissions } from "@/lib/missions/MissionsProvider";
import type { MissionsApi } from "@/lib/missions/types";
import type { Actor } from "@/domain/missions";
import { cn } from "@/lib/cn";
import { SkeletonList, Spinner, btn } from "./kit";

/**
 * Porte commune des écrans qui lisent les missions (Agenda, Notifications) : états chargement / configuration invalide / accès refusé / erreur.
 * Aucun contenu métier n'est rendu tant que l'état n'est pas « prêt » (jamais de données locales par défaut en cas de problème).
 */
export function MissionsGate({ eyebrow, title, children }: { eyebrow: string; title: string; children: (ctx: { actor: Actor; M: MissionsApi }) => React.ReactNode }) {
  const who = useActor(); const M = useMissions();
  const head = <StaffTitle eyebrow={eyebrow} title={title} />;
  if (M.status === "misconfigured") return <>{head}<StaffSection><div role="alert" data-testid="config-error" className="max-w-[40ch] rounded-[10px] border border-sunset/60 p-4"><p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-sunset">Configuration invalide</p><p className="mt-2 text-[0.95rem] text-cloud/80">{M.error?.message}</p></div></StaffSection></>;
  if (who.status === "loading" || M.status === "loading") return <>{head}<section className="px-5 pt-7" aria-busy="true"><p role="status" aria-live="polite" className="mb-4 flex items-center gap-2 font-mono text-[0.78rem] uppercase tracking-[0.12em] text-sky"><Spinner />Chargement…</p><SkeletonList /></section></>;
  if (who.status === "none") return <>{head}<StaffSection><p role="status" className="max-w-[34ch] border-l border-sky pl-4 text-[1rem] font-light leading-snug">Ce compte n&apos;est pas rattaché à un membre de l&apos;équipe.</p></StaffSection></>;
  if (M.status === "forbidden") return <>{head}<StaffSection><div role="alert" className="max-w-[36ch] border-l border-sunset pl-4"><p className="font-display text-[1.25rem] leading-snug">Accès refusé</p><p className="mt-2 text-[0.95rem] text-cloud/80">{M.error?.message ?? "Ce compte n'a pas accès aux données de STAFF HQ."}</p></div></StaffSection></>;
  if (M.status === "error") return <>{head}<StaffSection><div role="alert" className="max-w-[40ch] rounded-[10px] border border-sunset/60 p-4"><p className="font-display text-[1.25rem] leading-snug">Impossible de charger les données</p><p className="mt-2 text-[0.95rem] text-cloud/80">{M.error?.message}</p><div className="mt-4 flex flex-wrap items-center gap-4"><button type="button" onClick={() => void M.refresh()} className={cn(btn, "bg-cloud text-jet")}>Réessayer</button>{M.error?.kind === "auth" && <Link href="/staff/login" className="font-mono text-[0.78rem] uppercase tracking-[0.12em] text-sky underline underline-offset-4">Se reconnecter</Link>}</div></div></StaffSection></>;
  if (who.status !== "ok") return head;
  return <>{head}{children({ actor: who.actor, M })}</>;
}
