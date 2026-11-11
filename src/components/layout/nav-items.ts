import type { NavId } from "@/data/demo";

/**
 * SOURCE UNIQUE des quatre onglets de l'application participants (V3). HOME ouvre le véritable accueil V3 (`/v3`).
 * Ajouter une section = une ligne ici + un dossier dans src/app/v3.
 */
export const navItems: { id: NavId; label: string; href: string; icon: string }[] = [
  { id: "home", label: "Home", href: "/v3", icon: "home" },
  { id: "flight", label: "My Flight", href: "/v3/flight", icon: "plane" },
  { id: "explore", label: "Explore", href: "/v3/explore", icon: "compass" },
  { id: "club", label: "Club", href: "/v3/club", icon: "idcard" },
];

/** HOME n'est actif que sur l'accueil exact ; les autres onglets le sont sur leur page et ses sous-pages. Profil, compte, connexion : aucun onglet actif. */
export const isTabActive = (href: string, pathname: string): boolean =>
  href === "/v3" ? pathname === "/v3" : pathname === href || pathname.startsWith(`${href}/`);

/**
 * Anciennes routes de l'application participants (V1/V2) → équivalents V3. Table UNIQUE (utilisée par next.config.ts et testée) :
 * aucune cible ne figure parmi les sources (une seule redirection, jamais de chaîne ni de boucle) ; `/v3/*`, `/auth/*`, `/staff/*`, `/signal/*`, `/start` ne sont JAMAIS redirigés.
 */
export const legacyRedirects: { source: string; destination: string }[] = [
  { source: "/flight", destination: "/v3/flight" },
  { source: "/club", destination: "/v3/club" },
  { source: "/pass", destination: "/v3/flight" },
  { source: "/explore", destination: "/v3/explore" },
  { source: "/crew", destination: "/v3/club" },
  { source: "/more", destination: "/v3" },
  // SKYLINE RADIO devient SKYLINE SOUND (lecteur SoundCloud officiel).
  { source: "/v3/explore/radio/:path*", destination: "/v3/explore/sound" },
];
