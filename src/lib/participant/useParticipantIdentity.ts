"use client";
import { useSyncExternalStore } from "react";
import type { ParticipantProfile } from "./access";

/**
 * Identité du participant CONNECTÉ, lue auprès du serveur (`/api/participant/me`). Aucune identité n'est inventée :
 *  loading → rien n'est affiché · off → application de démonstration inchangée · anonymous / no_access → état adapté · ready → profil réel (ou absent).
 * Une seule lecture partagée par tous les composants de la page ; `refreshParticipantIdentity()` après une modification du profil.
 */
export type ParticipantIdentity =
  | { status: "loading" } | { status: "off" } | { status: "misconfigured"; configError: string } | { status: "anonymous" } | { status: "no_access" } | { status: "error" }
  | { status: "ready"; email: string; profile: ParticipantProfile | null; profileAvailable: boolean };

const LOADING: ParticipantIdentity = { status: "loading" };
let snap: ParticipantIdentity = LOADING; let started = false; const subs = new Set<() => void>();
const set = (s: ParticipantIdentity) => { snap = s; subs.forEach((f) => f()); };
async function load() {
  try {
    const r = await fetch("/api/participant/me", { cache: "no-store" }); if (!r.ok) { set({ status: "error" }); return; }
    const j = await r.json();
    if (j.mode === "off") set({ status: "off" });
    else if (j.mode === "misconfigured") set({ status: "misconfigured", configError: String(j.configError ?? "") });
    else if (j.status === "ready") set({ status: "ready", email: String(j.email ?? ""), profile: j.profile ?? null, profileAvailable: j.profileAvailable !== false });
    else if (j.status === "anonymous" || j.status === "no_access") set({ status: j.status });
    else set({ status: "error" });
  } catch { set({ status: "error" }); }
}
export const refreshParticipantIdentity = () => load();
const subscribe = (cb: () => void) => { subs.add(cb); if (!started) { started = true; void load(); } return () => { subs.delete(cb); }; };
export const useParticipantIdentity = () => useSyncExternalStore(subscribe, () => snap, () => LOADING);

/** Nom à afficher pour un participant : le nom affiché de son profil, sinon rien (jamais de nom inventé). */
export const identityName = (i: ParticipantIdentity): string | null => (i.status === "ready" && i.profile ? i.profile.displayName : null);
/** Vrai dès que l'authentification participants est active (même si l'identité n'est pas encore connue) : alors aucune identité de démonstration n'est affichée. */
export const authActive = (i: ParticipantIdentity) => i.status !== "off" && i.status !== "loading";
