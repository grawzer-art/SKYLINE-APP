/** Destinations internes autorisées après connexion. Jamais une URL externe, un chemin protocole-relatif ou une remontée de dossier. */
const INTERNAL = /^\/[A-Za-z0-9\-_./]*$/;
const clean = (n: string) => INTERNAL.test(n) && !n.includes("//") && !n.includes("..");
export const PARTICIPANT_HOME = "/v3/account";
export const safeParticipantNext = (n: string | null | undefined) => (n && /^\/v3(\/|$)/.test(n) && clean(n) ? n : PARTICIPANT_HOME);
export const safeStaffPath = (n: string | null | undefined) => (n && /^\/staff(\/|$)/.test(n) && clean(n) ? n : "/staff");
/** Retour de connexion : STAFF (/staff…) ou participants (/v3…) selon la destination mémorisée ; tout le reste retombe sur la valeur STAFF par défaut (comportement historique). */
export function resolveLoginNext(raw: string | null | undefined, participantEnabled: boolean): { kind: "staff" | "participant"; path: string } {
  if (participantEnabled && raw && /^\/v3(\/|$)/.test(raw)) return { kind: "participant", path: safeParticipantNext(raw) };
  return { kind: "staff", path: safeStaffPath(raw) };
}
/** Pages de déconnexion autorisées (liste fermée). */
export const SIGNOUT_TARGETS = ["/staff/login", "/v3/login", "/v3/profile"] as const;
export const safeSignoutTarget = (t: string | null | undefined) => (SIGNOUT_TARGETS as readonly string[]).includes(t ?? "") ? (t as string) : "/staff/login";
