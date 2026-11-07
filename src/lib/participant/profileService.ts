import type { SupabaseClient } from "@supabase/supabase-js";
import { validateProfileInput, type ProfileInput } from "../../domain/participant.ts";

/** Erreurs de la base → messages français sûrs (jamais le texte brut du serveur). */
const MESSAGES: Record<string, string> = {
  forbidden: "Accès non autorisé : votre compte n'a pas accès à l'espace participants.",
  invalid_first_name: "Prénom invalide.", invalid_last_name: "Nom invalide.", invalid_display_name: "Nom affiché invalide.",
};
export type SaveResult = { ok: true } | { ok: false; kind: "invalid" | "forbidden" | "network" | "unavailable" | "unknown"; message: string; fields?: Partial<Record<keyof ProfileInput, string>> };

/** Enregistre SON profil via la fonction SQL `upsert_my_participant_profile` (identité = session ; la base revalide tout). Validation locale = confort seulement. */
export async function saveParticipantProfile(client: SupabaseClient, input: ProfileInput): Promise<SaveResult> {
  const v = validateProfileInput(input); if (!v.ok) return { ok: false, kind: "invalid", message: "Vérifiez les champs signalés.", fields: v.errors };
  try {
    const { error } = await client.rpc("upsert_my_participant_profile", { p_first_name: v.value.firstName, p_last_name: v.value.lastName, p_display_name: v.value.displayName });
    if (!error) return { ok: true };
    const known = MESSAGES[(error.message ?? "").trim().toLowerCase()];
    if (known) return { ok: false, kind: (error.message ?? "").trim().toLowerCase() === "forbidden" ? "forbidden" : "invalid", message: known };
    if (error.code === "42883" || error.code === "PGRST202" || /could not find the function|does not exist/i.test(error.message ?? "")) return { ok: false, kind: "unavailable", message: "L'enregistrement du profil n'est pas encore disponible." };
    if (error.code === "42501" || /permission denied|row-level security/i.test(error.message ?? "")) return { ok: false, kind: "forbidden", message: MESSAGES.forbidden };
    if ((error as { status?: number }).status === 401 || /jwt/i.test(error.message ?? "")) return { ok: false, kind: "forbidden", message: "Votre session a expiré. Reconnectez-vous." };
    return { ok: false, kind: "unknown", message: "Une erreur inattendue est survenue. Réessayez dans un instant." };
  } catch { return { ok: false, kind: "network", message: "Connexion impossible. Vérifiez votre réseau puis réessayez." }; }
}
