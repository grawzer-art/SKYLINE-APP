"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { ClubInput, ClubProfile } from "@/domain/club";
import { loadMyClubProfile, saveMyClubProfile, setMyClubVisibility, removeMyAvatar, signedAvatarUrls, uploadMyAvatar, type Fail } from "./clubService";
import { compressAvatar } from "./compressAvatar";

export type ClubState = { status: "idle" | "loading" | "ready" | "unavailable" | "error"; profile: ClubProfile | null; avatarUrl: string | null; message?: string };
type Tagged = ClubState & { owner: string | null };

/**
 * SON profil CLUB (Supabase). `owner` = identifiant du compte connecté : à chaque changement de compte l'état est REMIS À ZÉRO avant toute nouvelle lecture,
 * afin qu'aucune donnée d'un compte ne reste affichée pour un autre. Inactif (`owner` nul) = aucune requête.
 */
export function useClubProfile(owner: string | null) {
  const [raw, setS] = useState<Tagged>({ owner: null, status: "idle", profile: null, avatarUrl: null });
  // Un état appartient à UN compte : s'il ne correspond pas au compte courant, il est ignoré (jamais de données d'un autre compte).
  const s: ClubState = raw.owner === owner ? raw : { status: owner ? "loading" : "idle", profile: null, avatarUrl: null };
  const [busy, setBusy] = useState(false);
  const seq = useRef(0); const ownerRef = useRef<string | null>(null);
  const client = useCallback(() => createBrowserSupabase(), []);
  const urlFor = useCallback(async (p: ClubProfile | null) => (p?.avatarPath ? (await signedAvatarUrls(client(), [p.avatarPath]))[p.avatarPath] ?? null : null), [client]);

  const load = useCallback(async () => {
    const my = ++seq.current; const o = ownerRef.current; if (!o) return;
    const r = await loadMyClubProfile(client()); if (my !== seq.current || o !== ownerRef.current) return;   // réponse périmée (autre compte / autre lecture)
    if (!r.ok) { setS({ owner: o, status: r.kind === "unavailable" ? "unavailable" : "error", profile: null, avatarUrl: null, message: r.message }); return; }
    const avatarUrl = await urlFor(r.profile); if (my !== seq.current || o !== ownerRef.current) return;
    setS({ owner: o, status: "ready", profile: r.profile, avatarUrl });
  }, [client, urlFor]);

  useEffect(() => {
    ownerRef.current = owner; seq.current++;
    if (owner) void load();
  }, [owner, load]);

  const run = async <T extends { ok: boolean }>(fn: () => Promise<T>): Promise<T> => { setBusy(true); try { return await fn(); } finally { setBusy(false); } };
  const save = (input: ClubInput) => run(async () => { const r = await saveMyClubProfile(client(), input); if (r.ok) setS((p) => (p.owner === owner ? { ...p, status: "ready", profile: r.profile } : p)); return r; });
  const setVisible = (v: boolean) => run(async () => { const r = await setMyClubVisibility(client(), v); if (r.ok) setS((p) => (p.owner === owner ? { ...p, profile: p.profile ? { ...p.profile, visible: v } : p.profile } : p)); return r; });
  const setPhoto = (file: File) => run(async (): Promise<{ ok: true } | Fail | { ok: false; kind: "photo"; message: string }> => {
    const c = await compressAvatar(file);
    if (!c.ok) return { ok: false, kind: "photo", message: c.reason === "type" ? "Format non pris en charge (JPEG, PNG ou WebP)." : c.reason === "size" ? "Image trop lourde (12 Mo maximum)." : c.reason === "toobig" ? "Image trop lourde après compression." : "Image illisible." };
    const r = await uploadMyAvatar(client(), c.blob, s.profile?.avatarPath ?? null); if (!r.ok) return r;
    const p = s.profile ? { ...s.profile, avatarPath: r.path } : null; setS((x) => (x.owner === owner ? { ...x, profile: p, avatarUrl: URL.createObjectURL(c.blob) } : x)); void urlFor(p).then((u) => u && setS((x) => (x.owner === owner ? { ...x, avatarUrl: u } : x)));
    return { ok: true };
  });
  const removePhoto = () => run(async () => { const r = await removeMyAvatar(client(), s.profile?.avatarPath ?? null); if (r.ok) setS((x) => (x.owner === owner ? { ...x, profile: x.profile ? { ...x.profile, avatarPath: null } : null, avatarUrl: null } : x)); return r; });
  return { ...s, busy, reload: load, save, setVisible, setPhoto, removePhoto };
}
