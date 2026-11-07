/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";
import { validateClubInput, type ClubErrors, type ClubInput, type ClubMember, type ClubProfile } from "../../domain/club.ts";

/** Erreurs de la base → messages français sûrs (jamais le texte brut du serveur). */
const MESSAGES: Record<string, string> = {
  forbidden: "Accès non autorisé : votre compte n'a pas accès à l'espace participants.",
  invalid_pseudo: "Pseudo invalide.", invalid_city: "Ville invalide.", invalid_bio: "Bio invalide.", invalid_genres: "Goûts musicaux invalides.",
  no_profile: "Créez d'abord votre profil CLUB.", invalid_avatar: "Photo invalide.",
  reciprocity_required: "Publiez votre profil CLUB pour consulter les autres membres.",
};
export type Kind = "invalid" | "forbidden" | "network" | "unavailable" | "no_profile" | "reciprocity" | "unknown";
export type Fail = { ok: false; kind: Kind; message: string; fields?: ClubErrors };
export type Res<T> = ({ ok: true } & T) | Fail;

export function mapError(error: { message?: string; code?: string; status?: number } | null | undefined): Fail {
  const raw = (error?.message ?? "").trim().toLowerCase();
  if (raw === "reciprocity_required") return { ok: false, kind: "reciprocity", message: MESSAGES.reciprocity_required };
  if (raw === "no_profile") return { ok: false, kind: "no_profile", message: MESSAGES.no_profile };
  if (MESSAGES[raw]) return { ok: false, kind: raw === "forbidden" ? "forbidden" : "invalid", message: MESSAGES[raw] };
  if (error?.code === "42883" || error?.code === "PGRST202" || error?.code === "PGRST205" || /could not find the (function|table)|does not exist/i.test(error?.message ?? "")) return { ok: false, kind: "unavailable", message: "Le profil CLUB n'est pas encore disponible." };
  if (error?.code === "42501" || /permission denied|row-level security/i.test(error?.message ?? "")) return { ok: false, kind: "forbidden", message: MESSAGES.forbidden };
  if (error?.status === 401 || /jwt/i.test(error?.message ?? "")) return { ok: false, kind: "forbidden", message: "Votre session a expiré. Reconnectez-vous." };
  return { ok: false, kind: "unknown", message: "Une erreur inattendue est survenue. Réessayez dans un instant." };
}
const NET: Fail = { ok: false, kind: "network", message: "Connexion impossible. Vérifiez votre réseau puis réessayez." };
const row = (r: any): ClubProfile => ({ pseudo: String(r.pseudo), city: r.city ?? null, bio: String(r.bio ?? ""), genres: Array.isArray(r.genres) ? r.genres.map(String) : [], avatarPath: r.avatar_path ?? null, visible: r.visible === true });
const member = (r: any): ClubMember => ({ id: String(r.public_id), pseudo: String(r.pseudo), city: r.city ?? null, bio: String(r.bio ?? ""), genres: Array.isArray(r.genres) ? r.genres.map(String) : [], avatarPath: r.avatar_path ?? null });
const first = (d: unknown) => (Array.isArray(d) ? d[0] : d) ?? null;

/** SON profil CLUB (null = pas encore créé). */
export async function loadMyClubProfile(c: SupabaseClient): Promise<Res<{ profile: ClubProfile | null }>> {
  try { const { data, error } = await c.rpc("get_my_club_profile"); if (error) return mapError(error); const r = first(data); return { ok: true, profile: r ? row(r) : null }; } catch { return NET; }
}
/** Crée ou modifie SON profil (visibilité et photo inchangées ; un profil neuf est privé). */
export async function saveMyClubProfile(c: SupabaseClient, input: ClubInput): Promise<Res<{ profile: ClubProfile }>> {
  const v = validateClubInput(input); if (!v.ok) return { ok: false, kind: "invalid", message: "Vérifiez les champs signalés.", fields: v.errors };
  try { const { data, error } = await c.rpc("upsert_my_club_profile", { p_pseudo: v.value.pseudo, p_city: v.value.city, p_bio: v.value.bio, p_genres: v.value.genres }); if (error) return mapError(error); const r = first(data); return r ? { ok: true, profile: row(r) } : mapError(null); } catch { return NET; }
}
export async function setMyClubVisibility(c: SupabaseClient, visible: boolean): Promise<Res<{ visible: boolean }>> {
  try { const { error } = await c.rpc("set_my_club_visibility", { p_visible: visible }); return error ? mapError(error) : { ok: true, visible }; } catch { return NET; }
}
/** Annuaire des profils publiés (champs publics). Fermé tant que SON profil n'est pas publié. */
export async function listClubDirectory(c: SupabaseClient, o: { text?: string; city?: string; limit?: number; offset?: number } = {}): Promise<Res<{ members: ClubMember[] }>> {
  try { const { data, error } = await c.rpc("list_club_directory", { p_text: o.text?.trim() || null, p_city: o.city || null, p_limit: o.limit ?? 24, p_offset: o.offset ?? 0 }); if (error) return mapError(error); return { ok: true, members: (Array.isArray(data) ? data : data ? [data] : []).map(member) }; } catch { return NET; }
}
export async function getClubMember(c: SupabaseClient, publicId: string): Promise<Res<{ member: ClubMember | null }>> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(publicId)) return { ok: true, member: null };
  try { const { data, error } = await c.rpc("get_club_member", { p_public_id: publicId }); if (error) return mapError(error); const r = first(data); return { ok: true, member: r ? member(r) : null }; } catch { return NET; }
}

/** Photo : le navigateur envoie un fichier DÉJÀ recompressé (≤ 512 px, JPEG/WebP) dans SON dossier ; la base valide ensuite le chemin. */
export async function uploadMyAvatar(c: SupabaseClient, blob: Blob, previousPath: string | null): Promise<Res<{ path: string }>> {
  try {
    const { data: u, error: ue } = await c.auth.getUser(); if (ue || !u.user) return { ok: false, kind: "forbidden", message: "Votre session a expiré. Reconnectez-vous." };
    const ext = blob.type === "image/webp" ? "webp" : "jpg"; if (blob.type !== "image/webp" && blob.type !== "image/jpeg") return { ok: false, kind: "invalid", message: "Photo invalide." };
    const path = `${u.user.id}/avatar-${Date.now().toString(36)}.${ext}`;
    const up = await c.storage.from("club-avatars").upload(path, blob, { contentType: blob.type, upsert: false }); if (up.error) return mapError(up.error as never);
    const { error } = await c.rpc("set_my_club_avatar", { p_path: path });
    if (error) { await c.storage.from("club-avatars").remove([path]); return mapError(error); }
    if (previousPath && previousPath !== path) await c.storage.from("club-avatars").remove([previousPath]);
    return { ok: true, path };
  } catch { return NET; }
}
export async function removeMyAvatar(c: SupabaseClient, previousPath: string | null): Promise<Res<object>> {
  try { const { error } = await c.rpc("set_my_club_avatar", { p_path: null }); if (error) return mapError(error); if (previousPath) await c.storage.from("club-avatars").remove([previousPath]); return { ok: true }; } catch { return NET; }
}
/** URL signées de courte durée (le bucket est privé) : chemin → URL. Un chemin illisible est simplement absent. */
export async function signedAvatarUrls(c: SupabaseClient, paths: string[], seconds = 3600): Promise<Record<string, string>> {
  const out: Record<string, string> = {}; const list = [...new Set(paths.filter(Boolean))]; if (!list.length) return out;
  try { const { data } = await c.storage.from("club-avatars").createSignedUrls(list, seconds); for (const d of data ?? []) if (d.path && d.signedUrl && !d.error) out[d.path] = d.signedUrl; } catch { /* sans photo */ }
  return out;
}
