import type { SupabaseClient } from "@supabase/supabase-js";
import { canEnterStaff, type Access, type PlatformRole, type Space, type StaffRole } from "@/lib/auth/roles";

export type StaffIdentity = { userId: string; email: string; slug: string; name: string; access: Access };

/**
 * Identité STAFF d'un utilisateur déjà authentifié, lue dans la base (soumise aux politiques RLS : seulement SES propres lignes) :
 * compte actif, rôle global, accès par espace, permissions STAFF, fiche d'annuaire. Retourne null si le compte est inactif ou n'a pas
 * l'accès STAFF HQ (refus par défaut) — un participant (accès `members` seul) n'obtient JAMAIS d'identité STAFF.
 */
export async function loadStaffIdentity(supabase: SupabaseClient, userId: string, email: string): Promise<StaffIdentity | null> {
  const [account, platform, spaces, staff, profile] = await Promise.all([
    supabase.from("accounts").select("display_name, active").eq("id", userId).maybeSingle(),
    supabase.from("platform_roles").select("role").eq("user_id", userId),
    supabase.from("space_access").select("space").eq("user_id", userId),
    supabase.from("staff_roles").select("role").eq("user_id", userId),
    supabase.from("staff_profiles").select("slug").eq("user_id", userId).maybeSingle(),
  ]);
  if (!account.data || !account.data.active || !profile.data) return null;
  const access: Access = { platform: (platform.data ?? []).map((r) => r.role as PlatformRole), spaces: (spaces.data ?? []).map((r) => r.space as Space), staff: (staff.data ?? []).map((r) => r.role as StaffRole) };
  if (!canEnterStaff(access)) return null;
  return { userId, email, slug: profile.data.slug, name: account.data.display_name, access };
}
