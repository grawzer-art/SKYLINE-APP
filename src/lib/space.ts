/**
 * Préférence d'ESPACE à l'ouverture de l'application (MEMBERS ou STAFF). C'est un simple confort de navigation :
 * elle ne donne AUCUN droit. L'accès à STAFF HQ reste contrôlé par le serveur (src/proxy.ts).
 */
export const SPACE_COOKIE = "sk_space";
export type Space = "members" | "staff";
export const isSpace = (v: string | undefined | null): v is Space => v === "members" || v === "staff";
export function rememberSpace(space: Space) {
  if (typeof document === "undefined") return;
  document.cookie = `${SPACE_COOKIE}=${space}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
}
