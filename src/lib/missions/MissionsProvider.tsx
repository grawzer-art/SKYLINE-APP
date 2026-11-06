"use client";
import { createContext, useContext } from "react";
import { useMissionsSource } from "./useMissionsSource";
import type { MissionsApi } from "./types";

/**
 * UNE SEULE instance des missions pour tout STAFF HQ (Missions, Agenda, Notifications, cloche de l'en-tête) : un seul chargement, un état
 * cohérent entre les écrans, aucun clignotement en changeant d'onglet. La source (locale / base) est décidée dans `useMissionsSource`.
 */
const Ctx = createContext<MissionsApi | null>(null);
export function MissionsProvider({ children }: { children: React.ReactNode }) {
  const api = useMissionsSource();
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
export function useMissions(): MissionsApi {
  const v = useContext(Ctx); if (!v) throw new Error("useMissions doit être utilisé sous <MissionsProvider> (layout STAFF).");
  return v;
}
