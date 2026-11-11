"use client";
import { useSyncExternalStore } from "react";

export type EventPhase = "before" | "during" | "after";

const BUCKET = 30_000;
const subscribeTick = (cb: () => void) => { const t = setInterval(cb, BUCKET); return () => clearInterval(t); };

const resolve = (startISO: string, endISO: string, now: number): EventPhase => {
  const s = Date.parse(startISO), e = Date.parse(endISO);
  if (Number.isNaN(s) || now < s) return "before";
  if (!Number.isNaN(e) && now >= e) return "after";
  return "during";
};

/**
 * Phase de l'événement, qui pilote l'ambiance de HOME.
 * Côté serveur : toujours « before » → pas de décalage d'hydratation.
 */
export function useEventPhase(startISO: string, endISO: string): EventPhase {
  const bucket = useSyncExternalStore(subscribeTick, () => Math.floor(Date.now() / BUCKET), () => 0);
  return bucket === 0 ? "before" : resolve(startISO, endISO, bucket * BUCKET);
}
