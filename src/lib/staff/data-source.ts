import { staffAuthMode } from "./mode.ts";

/**
 * Source des données de STAFF HQ (missions…).
 *  - « local » (PAR DÉFAUT) : données de démonstration enregistrées sur l'appareil. Aucun appel à la base.
 *  - « db »    : base Supabase (RLS + fonctions). Exige IMPÉRATIVEMENT l'authentification Supabase : sans elle, retour à « local ».
 * Activation explicite uniquement (`STAFF_DATA_SOURCE=db`) : aucun basculement automatique.
 */
export type StaffDataSource = "local" | "db";
export const resolveDataSource = (env: { STAFF_DATA_SOURCE?: string }, authMode: "demo" | "supabase"): StaffDataSource => (env.STAFF_DATA_SOURCE === "db" && authMode === "supabase" ? "db" : "local");
export const staffDataSource = (): StaffDataSource => resolveDataSource({ STAFF_DATA_SOURCE: process.env.STAFF_DATA_SOURCE }, staffAuthMode());
