import type { SupabaseClient } from "@supabase/supabase-js";
import type { Role } from "@/lib/auth/roles";

export type StaffIdentity = { userId: string; email: string; slug: string; name: string; roles: Role[] };

/**
 * Identité STAFF d'un utilisateur déjà authentifié : profil actif + rôles lus dans la base (soumis aux politiques RLS).
 * Retourne null si le profil est inactif ou sans rôle (refus par défaut).
 */
export async function loadStaffIdentity(supabase: SupabaseClient, userId: string, email: string): Promise<StaffIdentity | null> {
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("slug, display_name, active").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);
  if (!profile || !profile.active || !roles?.length) return null;
  return { userId, email, slug: profile.slug, name: profile.display_name, roles: roles.map((r) => r.role as Role) };
}
