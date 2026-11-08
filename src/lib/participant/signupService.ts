import type { SupabaseClient } from "@supabase/supabase-js";
import { validateProfileInput, type ProfileInput } from "../../domain/participant.ts";

export type ClaimResult =
  | { ok: true; outcome: "created" | "already_member" }
  | { ok: false; kind: "invalid" | "not_eligible" | "suspended" | "email_not_confirmed" | "session" | "network" | "unavailable" | "unknown"; message: string; fields?: Partial<Record<keyof ProfileInput, string>> };
const MSG: Record<string, [Extract<ClaimResult, { ok: false }>["kind"], string]> = {
  email_not_confirmed: ["email_not_confirmed", "Votre adresse e-mail n'est pas encore confirmée. Saisissez le code reçu."],
  not_eligible: ["not_eligible", "Ce compte existe déjà ou ne peut pas être créé ici."],
  suspended: ["suspended", "Ce compte est désactivé. Contactez l'organisation SKYLINE."],
  adult_required: ["invalid", "Vous devez attester être majeur."], terms_required: ["invalid", "Vous devez accepter les conditions."],
  invalid_first_name: ["invalid", "Prénom invalide."], invalid_last_name: ["invalid", "Nom invalide."], invalid_display_name: ["invalid", "Nom affiché invalide."],
};
/**
 * Finalise l'inscription : appelle la fonction SQL `claim_member_account` (identité = session ; la base revérifie l'e-mail confirmé, l'état du compte et les droits
 * existants, puis crée profil + accès « members » atomiquement). Aucun rôle ni espace n'est transmis. Messages sûrs, jamais le texte brut du serveur.
 */
export async function claimMemberAccount(client: SupabaseClient, input: ProfileInput, termsVersion: string): Promise<ClaimResult> {
  const v = validateProfileInput(input); if (!v.ok) return { ok: false, kind: "invalid", message: "Vérifiez les champs signalés.", fields: v.errors };
  try {
    const { data, error } = await client.rpc("claim_member_account", { p_first_name: v.value.firstName, p_last_name: v.value.lastName, p_display_name: v.value.displayName, p_terms_version: termsVersion, p_adult: true });
    if (!error) { const row = Array.isArray(data) ? data[0] : data; const o = row?.outcome; return o === "created" || o === "already_member" ? { ok: true, outcome: o } : { ok: false, kind: "unknown", message: "Une erreur inattendue est survenue. Réessayez dans un instant." }; }
    const known = MSG[(error.message ?? "").trim().toLowerCase()]; if (known) return { ok: false, kind: known[0], message: known[1] };
    if (error.code === "42883" || error.code === "PGRST202" || /could not find the function|does not exist/i.test(error.message ?? "")) return { ok: false, kind: "unavailable", message: "L'inscription n'est pas encore disponible." };
    if ((error as { status?: number }).status === 401 || /jwt/i.test(error.message ?? "") || error.code === "42501") return { ok: false, kind: "session", message: "Votre session a expiré. Recommencez l'inscription." };
    return { ok: false, kind: "unknown", message: "Une erreur inattendue est survenue. Réessayez dans un instant." };
  } catch { return { ok: false, kind: "network", message: "Connexion impossible. Vérifiez votre réseau puis réessayez." }; }
}
