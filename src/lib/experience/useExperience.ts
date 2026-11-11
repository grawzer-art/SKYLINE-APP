"use client";
import { useMemo, useSyncExternalStore } from "react";
import { event, eventConfirmation } from "@/data/demo";
import { useEventPhase } from "@/lib/useEventPhase";
import { useParticipantIdentity } from "@/lib/participant/useParticipantIdentity";
import { useProto } from "@/lib/useProto";
import { resolveExperience, type Experience } from "./resolve";

/** Mode revue autorisé par le serveur (booléen unique, lu une fois). `null` tant que la réponse n'est pas arrivée : rien de simulé n'est affiché entre-temps. */
let review: boolean | null = null; let started = false; const subs = new Set<() => void>();
const set = (v: boolean) => { review = v; subs.forEach((f) => f()); };
async function load() { try { const r = await fetch("/api/review-mode", { cache: "no-store" }); const j = r.ok ? await r.json() : null; set(j?.review === true); } catch { set(false); } }
const subscribe = (cb: () => void) => { subs.add(cb); if (!started) { started = true; void load(); } return () => { subs.delete(cb); }; };
const useReviewMode = () => useSyncExternalStore(subscribe, () => review, () => null);

/** Seule porte d'entrée des composants vers « ce qui est vrai » : mode, phase, statut de réservation. */
export function useExperience(): Experience {
  const rv = useReviewMode(); const identity = useParticipantIdentity(); const { state } = useProto(); const datePhase = useEventPhase(event.departureISO, event.endISO);
  return useMemo(() => resolveExperience({ review: rv, identity, proto: { phase: state.phase, sim: state.sim }, confirmation: eventConfirmation, datePhase }),
    [rv, identity, state.phase, state.sim, datePhase]);
}
