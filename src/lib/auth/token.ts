import type { DemoSession, Role } from "./roles";
import { ROLES } from "./roles";

/**
 * Jeton de session de DÉMONSTRATION : charge utile JSON + signature HMAC-SHA256 (Web Crypto, utilisable dans le proxy).
 * La signature empêche de fabriquer ou modifier un rôle côté client. Le secret par défaut est PUBLIC (dépôt) :
 * définir `DEMO_SESSION_SECRET` sur Vercel, et remplacer tout ce module par une vraie authentification avant la production.
 */
export const SESSION_COOKIE = "sk_demo";
export const SESSION_TTL_SECONDS = 60 * 60 * 8;
/**
 * L'authentification de démonstration est ACTIVE par défaut sur les prévisualisations et en local, et DÉSACTIVÉE par défaut
 * sur la production Vercel (sauf `DEMO_AUTH=on`). `DEMO_AUTH=off` la coupe partout. Désactivée : aucune session n'est valide.
 */
export const demoAuthEnabled = () => process.env.DEMO_AUTH === "on" || (process.env.DEMO_AUTH !== "off" && process.env.VERCEL_ENV !== "production");
const SECRET = () => process.env.DEMO_SESSION_SECRET || "skyline-demo-only-secret-not-for-production";

const enc = new TextEncoder();
const b64u = (bytes: ArrayBuffer | Uint8Array) => { const a = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes); let s = ""; for (const b of a) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
const fromB64u = (s: string) => { const p = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4); const bin = atob(p); return Uint8Array.from(bin, (c) => c.charCodeAt(0)); };
const key = () => crypto.subtle.importKey("raw", enc.encode(SECRET()), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);

export async function signSession(s: Omit<DemoSession, "iat" | "exp" | "demo">): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = b64u(enc.encode(JSON.stringify({ ...s, demo: true, iat: now, exp: now + SESSION_TTL_SECONDS })));
  const sig = await crypto.subtle.sign("HMAC", await key(), enc.encode(payload));
  return `${payload}.${b64u(sig)}`;
}

/** Retourne la session si (et seulement si) la signature est valide, le jeton non expiré et les rôles connus. */
export async function verifySession(token: string | undefined | null): Promise<DemoSession | null> {
  if (!token || !demoAuthEnabled()) return null;
  const [payload, sig, extra] = token.split(".");
  if (!payload || !sig || extra !== undefined) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await key(), fromB64u(sig), enc.encode(payload));
    if (!ok) return null;
    const s = JSON.parse(new TextDecoder().decode(fromB64u(payload))) as DemoSession;
    if (s.demo !== true || typeof s.exp !== "number" || s.exp < Math.floor(Date.now() / 1000)) return null;
    if (!Array.isArray(s.roles) || !s.roles.every((r): r is Role => (ROLES as readonly string[]).includes(r))) return null;
    return s;
  } catch { return null; }
}
