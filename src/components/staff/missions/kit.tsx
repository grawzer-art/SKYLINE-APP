"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { STATUS_LABEL, type MissionStatus } from "@/domain/missions";
import type { ActionResult } from "@/lib/missions/types";

export const field = "mt-2 min-h-12 w-full rounded-[8px] border border-line bg-surface-1 px-4 text-[1rem] outline-none focus:border-sky disabled:opacity-50";
export const label = "block font-mono text-[0.75rem] uppercase tracking-[0.16em] text-cloud/72";
export const btn = "inline-flex min-h-12 items-center justify-center rounded-full px-6 font-mono text-[0.78rem] uppercase tracking-[0.14em] transition active:scale-[0.97] disabled:opacity-40";
const statusStyle: Record<MissionStatus, string> = { todo: "border-silver/50 text-cloud/85", in_progress: "border-sky text-sky", review: "border-sunset text-sunset", done: "border-cloud/20 bg-cloud/10 text-cloud/70" };
export const StatusPill = ({ s }: { s: MissionStatus }) => <span className={cn("inline-flex min-h-7 items-center rounded-full border px-3 font-mono text-[0.72rem] uppercase tracking-[0.1em]", statusStyle[s])}>{STATUS_LABEL[s]}</span>;

export const localISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const addDays = (iso: string, n: number) => { const [y, m, d] = iso.split("-").map(Number); return localISO(new Date(y, m - 1, d + n)); };
export const fmtDate = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(y, m - 1, d)); };
export const fmtWhen = (iso: string) => (iso ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)) : "");

/**
 * Une ACTION = son propre état : en cours / réussie / échouée. Une seule exécution à la fois (anti double-envoi).
 * Chaque section de l'écran (informations, attribution, statut, commentaire…) a SA propre instance : jamais d'état partagé ni d'action composite.
 */
export function useAction<A extends unknown[]>(fn: (...a: A) => Promise<ActionResult>) {
  const [s, setS] = useState<{ pending: boolean; result: ActionResult | null }>({ pending: false, result: null });
  const busy = useRef(false);
  const run = async (...a: A): Promise<ActionResult | null> => {
    if (busy.current) return null; busy.current = true; setS({ pending: true, result: null });
    let r: ActionResult; try { r = await fn(...a); } catch { r = { ok: false, kind: "unknown", message: "Une erreur inattendue est survenue. Réessayez dans un instant." }; }
    busy.current = false; setS({ pending: false, result: r }); return r;
  };
  return { ...s, run, clear: () => setS({ pending: false, result: null }) };
}

/** Résultat d'une action : chargement, succès, ou erreur avec la suite à donner (recharger, se reconnecter). */
export function ActionNotice({ pending, result, doing, done, onReload }: { pending: boolean; result: ActionResult | null; doing: string; done?: string; onReload?: () => void }) {
  if (pending) return <p role="status" aria-live="polite" className="mt-3 flex items-center gap-2 font-mono text-[0.78rem] uppercase tracking-[0.12em] text-sky"><Spinner />{doing}</p>;
  if (!result) return null;
  if (result.ok) return done ? <p role="status" aria-live="polite" className="mt-3 text-[0.9rem] text-sky">✓ {done}</p> : null;
  const reload = result.kind === "conflict" || result.kind === "not_found";
  return (
    <div role="alert" className="mt-3 rounded-[8px] border border-sunset/60 px-3 py-2.5 text-[0.9rem] leading-snug text-cloud/90">
      <p className="text-sunset">{result.kind === "conflict" ? "Conflit de modification" : result.kind === "forbidden" ? "Non autorisé" : result.kind === "network" ? "Connexion" : result.kind === "auth" ? "Session expirée" : "Action impossible"}</p>
      <p className="mt-1">{result.message}</p>
      {reload && onReload && <button type="button" onClick={onReload} className="mt-2 min-h-11 font-mono text-[0.78rem] uppercase tracking-[0.12em] text-sky underline underline-offset-4">Recharger les missions</button>}
      {result.kind === "auth" && <Link href="/staff/login" className="mt-2 inline-flex min-h-11 items-center font-mono text-[0.78rem] uppercase tracking-[0.12em] text-sky underline underline-offset-4">Se reconnecter</Link>}
    </div>
  );
}

export const Spinner = () => <span aria-hidden className="inline-block size-3.5 animate-spin rounded-full border-2 border-sky/30 border-t-sky motion-reduce:animate-none" />;
export const SkeletonList = () => (
  <ul aria-hidden className="space-y-3">{[0, 1, 2].map((i) => <li key={i} className="h-[92px] animate-pulse rounded-[10px] border border-line bg-surface-1 motion-reduce:animate-none" />)}</ul>
);
