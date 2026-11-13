/**
 * CONTENUS DE DÉMONSTRATION SERVIS PAR LE SERVEUR (Signaux fictifs, playlist de test, outils de prototype).
 * MASQUÉS PAR DÉFAUT. Visibles uniquement pour une construction LOCALE de revue interne : cumul de
 *  1. SKYLINE_REVIEW_MODE=on (action explicite) ;
 *  2. aucune plateforme d'hébergement : ni VERCEL ni VERCEL_ENV (une Preview ou la Production Vercel ne peut donc jamais les afficher,
 *     même si SKYLINE_REVIEW_MODE y est défini par erreur).
 * Pourquoi sans l'hôte de la requête : les pages SIGNAL et SOUND sont prérendues au build (cacheComponents) et ne voient aucune requête.
 * La décision est donc prise au build/au démarrage, et reste fermée en cas de variable absente, vide ou incorrecte.
 * Fonction pure (testée).
 */
export type DemoEnv = { SKYLINE_REVIEW_MODE?: string; VERCEL?: string; VERCEL_ENV?: string };
export function demoContentAllowed(env: DemoEnv): boolean {
  if (env.SKYLINE_REVIEW_MODE !== "on") return false;
  if ((env.VERCEL ?? "") !== "" || (env.VERCEL_ENV ?? "") !== "") return false;
  return true;
}
/**
 * Décision « figée au build » : next.config.ts inscrit SKYLINE_DEMO_BUILD dans la construction. Une construction sans revue ne peut donc PAS
 * servir de contenu de démonstration, même si SKYLINE_REVIEW_MODE=on est ajouté ensuite au démarrage (pages rendues à la demande comprises).
 */
export const demoContentFromProcess = (): boolean =>
  process.env.SKYLINE_DEMO_BUILD === "on" && demoContentAllowed({ SKYLINE_REVIEW_MODE: process.env.SKYLINE_REVIEW_MODE, VERCEL: process.env.VERCEL, VERCEL_ENV: process.env.VERCEL_ENV });
