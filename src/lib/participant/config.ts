import { supabaseEnv } from "../staff/mode.ts";

/**
 * Authentification PARTICIPANTS. RÉUTILISE Supabase Auth et les mêmes clients / cookies / callback que STAFF HQ (un seul système d'authentification).
 *  - PARTICIPANT_AUTH absente ou « off » : application participants INCHANGÉE (prototype de démonstration, aucune connexion).
 *  - PARTICIPANT_AUTH=supabase : connexion par code e-mail, profil réel. Exige l'URL et la clé PUBLIQUE Supabase.
 * RÈGLE (comme B2) : une configuration demandée mais incorrecte n'est JAMAIS corrigée en silence : erreur explicite, limitée aux pages personnelles
 * (le reste de l'application participants reste disponible).
 */
export type ParticipantConfig = { mode: "off" | "supabase" | "misconfigured"; issue: string | null };
export function evaluateParticipantConfig(env: { PARTICIPANT_AUTH?: string; supabaseConfigured: boolean }): ParticipantConfig {
  const v = (env.PARTICIPANT_AUTH ?? "") === "" ? "off" : env.PARTICIPANT_AUTH;
  if (v === "off") return { mode: "off", issue: null };
  if (v !== "supabase") return { mode: "misconfigured", issue: "PARTICIPANT_AUTH a une valeur non reconnue (attendu : « off » ou « supabase »)." };
  if (!env.supabaseConfigured) return { mode: "misconfigured", issue: "PARTICIPANT_AUTH=supabase est demandé mais l'URL ou la clé publique Supabase est absente (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)." };
  return { mode: "supabase", issue: null };
}
export const participantConfig = (): ParticipantConfig => evaluateParticipantConfig({ PARTICIPANT_AUTH: process.env.PARTICIPANT_AUTH, supabaseConfigured: !!supabaseEnv() });
