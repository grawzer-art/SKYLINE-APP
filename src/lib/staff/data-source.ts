import { supabaseEnv } from "./mode.ts";

/**
 * Configuration de STAFF HQ : authentification + source des données, VALIDÉES ensemble.
 *  - STAFF_DATA_SOURCE absente ou « local » : données de démonstration locales (défaut).
 *  - STAFF_DATA_SOURCE=db : base Supabase. Exige STAFF_AUTH_MODE=supabase ET l'URL / la clé publique Supabase.
 * RÈGLE DE SÉCURITÉ : une configuration demandée mais incorrecte n'est JAMAIS corrigée en silence (pas de retour discret aux données locales :
 * l'équipe croirait ses missions synchronisées). Elle produit une ERREUR EXPLICITE et STAFF HQ est suspendu (voir src/proxy.ts).
 * Les messages ne citent que des noms de variables, jamais leurs valeurs.
 */
export type StaffDataSource = "local" | "db";
export type StaffConfig = { auth: "demo" | "supabase"; data: StaffDataSource | "misconfigured"; issue: string | null };
export type ConfigEnv = { STAFF_AUTH_MODE?: string; STAFF_DATA_SOURCE?: string; supabaseConfigured: boolean };

export function evaluateStaffConfig(env: ConfigEnv): StaffConfig {
  const a = (env.STAFF_AUTH_MODE ?? "").trim() === "" ? "demo" : env.STAFF_AUTH_MODE;
  const d = (env.STAFF_DATA_SOURCE ?? "") === "" ? "local" : env.STAFF_DATA_SOURCE;
  const bad = (issue: string): StaffConfig => ({ auth: a === "supabase" ? "supabase" : "demo", data: "misconfigured", issue });
  if (a !== "demo" && a !== "supabase") return bad("STAFF_AUTH_MODE a une valeur non reconnue (attendu : « demo » ou « supabase »).");
  if (d !== "local" && d !== "db") return bad("STAFF_DATA_SOURCE a une valeur non reconnue (attendu : « local » ou « db »).");
  if (a === "supabase" && !env.supabaseConfigured) return bad("STAFF_AUTH_MODE=supabase est demandé mais l'URL ou la clé publique Supabase est absente (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).");
  if (d === "db" && a !== "supabase") return bad("STAFF_DATA_SOURCE=db est demandé mais l'authentification Supabase n'est pas active (STAFF_AUTH_MODE=supabase requis).");
  return { auth: a, data: d, issue: null };
}

/** Configuration de l'environnement courant (serveur). */
export const staffConfig = (): StaffConfig => evaluateStaffConfig({ STAFF_AUTH_MODE: process.env.STAFF_AUTH_MODE, STAFF_DATA_SOURCE: process.env.STAFF_DATA_SOURCE, supabaseConfigured: !!supabaseEnv() });
export const staffConfigIssue = (): string | null => staffConfig().issue;
/** Source des données : `misconfigured` = erreur de configuration (aucune donnée n'est servie, ni locale ni base). */
export const staffDataSource = (): StaffDataSource | "misconfigured" => staffConfig().data;
