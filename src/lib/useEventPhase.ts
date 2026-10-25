"use client";
import { useSyncExternalStore } from "react";

export type EventPhase = "before" | "during" | "after";

const BUCKET = 30_000;
const noop = () => () => {};
const subscribeTick = (cb: () => void) => { const t = setInterval(cb, BUCKET); return () => clearInterval(t); };

const resolve = (startISO: string, endISO: string, now: number): EventPhase => {
  const s = Date.parse(startISO), e = Date.parse(endISO);
  if (Number.isNaN(s) || now < s) return "before";
  if (!Number.isNaN(e) && now >= e) return "after";
  return "during";
};

/**
 * Phase de l'événement, qui pilote l'ambiance de HOME.
 * Revue créative : `?phase=before|during|after` force une phase (démo uniquement).
 * Côté serveur : toujours « before » → pas de décalage d'hydratation.
 */
export function useEventPhase(startISO: string, endISO: string): EventPhase {
  const forced = useSyncExternalStore(noop, () => new URLSearchParams(window.location.search).get("phase"), () => null);
  const bucket = useSyncExternalStore(subscribeTick, () => Math.floor(Date.now() / BUCKET), () => 0);
  if (forced === "before" || forced === "during" || forced === "after") return forced;
  return bucket === 0 ? "before" : resolve(startISO, endISO, bucket * BUCKET);
}
