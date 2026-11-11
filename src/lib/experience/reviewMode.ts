/**
 * MODE REVUE INTERNE (prototype complet : phases, simulation, données fictives, plan des écrans). LOCAL UNIQUEMENT.
 * Il n'existe PAS en prévisualisation ni en production : une variable d'environnement seule ne suffit jamais. Conditions cumulatives, toutes vérifiées CÔTÉ SERVEUR :
 *  1. SKYLINE_REVIEW_MODE=on (action explicite) ;
 *  2. aucune plateforme d'hébergement : ni VERCEL ni VERCEL_ENV (donc jamais sur un déploiement Vercel, Preview comme Production) ;
 *  3. la requête vise une adresse de boucle locale (localhost, 127.0.0.1, [::1]) et ne traverse aucun relais (pas d'en-tête x-forwarded-host).
 * Fonction pure (testée) : l'hôte et les en-têtes sont fournis par l'appelant.
 */
export type ReviewEnv = { SKYLINE_REVIEW_MODE?: string; VERCEL?: string; VERCEL_ENV?: string };
export type ReviewRequest = { host?: string | null; forwardedHost?: string | null };
const LOOPBACK = /^(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$/i;
export const isLoopbackHost = (h: string | null | undefined): boolean => LOOPBACK.test((h ?? "").trim());
export function reviewModeAllowed(env: ReviewEnv, req: ReviewRequest): boolean {
  if (env.SKYLINE_REVIEW_MODE !== "on") return false;
  if ((env.VERCEL ?? "") !== "" || (env.VERCEL_ENV ?? "") !== "") return false;
  if ((req.forwardedHost ?? "").trim() !== "") return false;
  return isLoopbackHost(req.host);
}
export const reviewModeFromProcess = (req: ReviewRequest): boolean =>
  reviewModeAllowed({ SKYLINE_REVIEW_MODE: process.env.SKYLINE_REVIEW_MODE, VERCEL: process.env.VERCEL, VERCEL_ENV: process.env.VERCEL_ENV }, req);
