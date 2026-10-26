"use client";
import { useSyncExternalStore } from "react";

const STEP = 15_000;
const subscribe = (cb: () => void) => { const t = setInterval(cb, STEP); return () => clearInterval(t); };

/** Heure courante arrondie (15 s), lisible pendant le rendu sans casser le pré-rendu : 0 côté serveur. */
export const useClock = () => useSyncExternalStore(subscribe, () => Math.floor(Date.now() / STEP) * STEP, () => 0);
