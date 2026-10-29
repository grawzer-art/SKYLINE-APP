/**
 * Mode d'authentification de STAFF HQ.
 *  - « supabase » : authentification individuelle + base de données (RLS). Exige l'URL et la clé PUBLIQUE Supabase
 *    ET `STAFF_AUTH_MODE=supabase` (activation explicite, pour ne rien casser tant que les migrations ne sont pas appliquées).
 *  - « demo » : session de démonstration (cookie signé) et données locales — comportement actuel, jamais en production réelle.
 * Aucune clé secrète n'est utilisée ici : seule la clé publique (« publishable ») peut figurer côté navigateur.
 */
export type StaffAuthMode = "supabase" | "demo";
export const supabaseEnv = (): { url: string; key: string } | null => {
  // Références littérales : Next.js remplace NEXT_PUBLIC_* au build.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url, key } : null;
};
export const staffAuthMode = (): StaffAuthMode => (process.env.STAFF_AUTH_MODE === "supabase" && supabaseEnv() ? "supabase" : "demo");
/** Adresse de connexion selon le mode. */
export const loginPath = () => (staffAuthMode() === "supabase" ? "/staff/login" : "/staff/access");
