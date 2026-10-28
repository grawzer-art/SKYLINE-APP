/**
 * SKYLINE SOUND — règles pures autour du widget SoundCloud OFFICIEL (iframe embarquée).
 * Aucun fichier audio n'est téléchargé, extrait ni réhébergé : on ne construit que l'URL du lecteur SoundCloud.
 */
export type EmbedKind = "set" | "track" | "other";
export type ParsedSoundCloudUrl = { ok: true; url: string; kind: EmbedKind } | { ok: false; reason: "empty" | "invalid" | "host" };

const HOSTS = new Set(["soundcloud.com", "www.soundcloud.com", "m.soundcloud.com", "on.soundcloud.com", "api.soundcloud.com"]);

/** Accepte uniquement une URL https:// d'un domaine SoundCloud. Rien d'autre n'est jamais injecté dans l'iframe. */
export function parseSoundCloudUrl(input: string | null | undefined): ParsedSoundCloudUrl {
  const raw = (input ?? "").trim();
  if (!raw) return { ok: false, reason: "empty" };
  let u: URL;
  try { u = new URL(raw); } catch { return { ok: false, reason: "invalid" }; }
  if (u.protocol !== "https:" || u.username || u.password) return { ok: false, reason: "invalid" };
  if (!HOSTS.has(u.hostname.toLowerCase())) return { ok: false, reason: "host" };
  if (u.pathname.replace(/\//g, "") === "") return { ok: false, reason: "invalid" };
  const kind: EmbedKind = /\/sets\//.test(u.pathname) || /\/playlists\//.test(u.pathname) ? "set" : u.hostname === "on.soundcloud.com" ? "other" : /\/tracks\//.test(u.pathname) || u.pathname.split("/").filter(Boolean).length >= 2 ? "track" : "other";
  return { ok: true, url: u.toString(), kind };
}

/** URL de l'iframe du widget officiel. Jamais de lecture automatique ; éléments SoundCloud conservés (pas de masquage). */
export function embedSrc(url: string): string {
  const p = new URLSearchParams({ url, color: "#8FB8FF", auto_play: "false", hide_related: "true", show_comments: "false", show_user: "true", show_reposts: "false", show_teaser: "true", visual: "false" });
  return `https://w.soundcloud.com/player/?${p.toString()}`;
}

/** Hauteur recommandée par SoundCloud : 166 px pour un titre, plus haute pour afficher la liste d'une playlist. */
export const embedHeight = (kind: EmbedKind) => (kind === "set" ? 380 : kind === "track" ? 166 : 300);
