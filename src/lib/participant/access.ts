import type { SupabaseClient } from "@supabase/supabase-js";

/** Profil participant (colonnes éditables par l'utilisateur UNIQUEMENT : jamais de rôle ni d'accès). */
export type ParticipantProfile = { userId: string; firstName: string; lastName: string; displayName: string; avatarPath: string | null; createdAt: string; updatedAt: string };

/**
 * Accès à l'espace participants d'un utilisateur DÉJÀ authentifié : compte actif ET accès « members » (table `space_access`, géré par le super admin).
 * Lecture soumise à la RLS (seulement SES lignes). Retourne false par défaut (refus). N'utilise JAMAIS les métadonnées de l'utilisateur.
 */
export async function loadParticipantAccess(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const [account, spaces] = await Promise.all([
    supabase.from("accounts").select("active").eq("id", userId).maybeSingle(),
    supabase.from("space_access").select("space").eq("user_id", userId),
  ]);
  if (!account.data?.active) return false;
  return (spaces.data ?? []).some((r) => r.space === "members");
}

const S = (v: unknown) => (typeof v === "string" ? v : "");
export async function loadParticipantProfile(supabase: SupabaseClient, userId: string): Promise<{ ok: true; profile: ParticipantProfile | null } | { ok: false; unavailable: boolean }> {
  const r = await supabase.from("participant_profiles").select("user_id,first_name,last_name,display_name,avatar_path,created_at,updated_at").eq("user_id", userId).maybeSingle();
  // Table absente (migration B4.1 pas encore appliquée) : « indisponible », pas une erreur — l'application reste utilisable sans profil.
  if (r.error) return { ok: false, unavailable: r.error.code === "42P01" || r.error.code === "PGRST205" || /does not exist|schema cache/i.test(r.error.message ?? "") };
  const d = r.data as Record<string, unknown> | null; if (!d) return { ok: true, profile: null };
  return { ok: true, profile: { userId: S(d.user_id), firstName: S(d.first_name), lastName: S(d.last_name), displayName: S(d.display_name), avatarPath: typeof d.avatar_path === "string" ? d.avatar_path : null, createdAt: S(d.created_at), updatedAt: S(d.updated_at) } };
}
