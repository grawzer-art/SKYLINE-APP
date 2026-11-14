/**
 * V3.2 — EN-TÊTE COMPACT de l'application participants. Pur et testé (aucune dépendance de composant).
 *  - « compact » : « SKYLINE | NOM D'ÉCRAN » + avatar, 44 px sous la zone sûre ; les écrans de second niveau ajoutent une flèche de retour.
 *    Le grand titre disparaît de la page (il reste un <h1> lisible par les lecteurs d'écran).
 *  - « home » : HOME — logo 26 px, avatar, aucun texte (la photo est plein écran).
 *  - « legacy » : ancien en-tête (EXPLORE, inscription) — migrés à l'étape 3 de la V3.2.
 * La revue locale (prototype interne) garde toujours l'ancien en-tête.
 */
export type HeaderMode = "compact" | "home" | "legacy";
export function headerMode(pathname: string, review: boolean): HeaderMode {
  if (review) return "legacy";
  if (pathname === "/v3") return "home";   // HOME : logo SKYLINE fort (26 px) sur la photo plein écran, sans nom d'écran
  return pathname === "/v3/flight" || pathname === "/v3/club" || pathname.startsWith("/v3/club/") || pathname === "/v3/profile" || pathname === "/v3/account" ? "compact" : "legacy";
}

/** Nom d'écran affiché dans l'en-tête compact (court : il doit tenir à côté du logo à 320 px). */
export function headerLabel(pathname: string): string {
  if (pathname === "/v3/flight") return "MY FLIGHT";
  if (pathname === "/v3/club") return "CLUB";
  if (pathname.startsWith("/v3/club/space")) return "PROFIL CLUB";
  if (pathname.startsWith("/v3/club/members")) return "MEMBRES";
  if (pathname.startsWith("/v3/club/messages")) return "MESSAGES";
  if (pathname.startsWith("/v3/club/memories")) return "SOUVENIRS";
  if (pathname.startsWith("/v3/club/community")) return "COMMUNAUTÉ";
  if (pathname === "/v3/profile") return "PROFIL";
  if (pathname === "/v3/account") return "COMPTE";
  return "";
}

/** Flèche de retour (second niveau) ; `null` = écran racine d'un onglet ou de l'avatar. */
export function headerBack(pathname: string): { href: string; label: string } | null {
  if (pathname.startsWith("/v3/club/") && pathname !== "/v3/club/") return { href: "/v3/club", label: "Club" };
  if (pathname === "/v3/account") return { href: "/v3/profile", label: "Profil" };
  return null;
}
