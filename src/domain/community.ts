/**
 * Règles métier de la communauté SKYLINE — couche PURE (aucune dépendance React / navigateur).
 * Source de vérité des règles : le futur serveur doit appliquer exactement les mêmes ; l'interface ne fait que les refléter.
 * Imports relatifs uniquement : ce fichier est testable directement par Node.
 */

export const LIMITS = {
  pseudoMin: 2,
  pseudoMax: 24,
  bioMax: 140,
  genresMax: 5,
  introMax: 140,
  messageMax: 500,
  requestsPerDay: 10,
  pendingMax: 30,
  burstMessages: 5,
  burstWindowMs: 10_000,
  declineRetryDays: 30,
  pageSize: 6,
} as const;

/** Conditions d'accès aux fonctions communautaires (messagerie incluse). */
export type Eligibility = {
  reservationConfirmed: boolean; // fourni par l'équipe (source confirmée)
  accountActive: boolean;
  adult: boolean;                // attestation 18+
  charter: boolean;              // charte de la communauté acceptée
  consent: boolean;              // activation volontaire des fonctions communautaires
};

export type EligibilityKey = keyof Eligibility;
export const eligibilityOrder: EligibilityKey[] = ["reservationConfirmed", "accountActive", "adult", "charter", "consent"];

export const missingConditions = (e: Eligibility): EligibilityKey[] => eligibilityOrder.filter((k) => !e[k]);
export const isEligible = (e: Eligibility): boolean => missingConditions(e).length === 0;

/* ---------- Validation ---------- */
export type Invalid<R extends string> = { ok: false; reason: R };
export type Valid = { ok: true; text: string };

const LINK = /(https?:\/\/|www\.|\b[a-z0-9-]{2,}\.(com|fr|io|app|me|net|org|be|ch|co|ly|gg|link|xyz)\b|[\w.+-]+@[\w-]+\.[\w.]+)/i;
const HANDLE = /(^|\s)@[a-z0-9_.]{3,}/i;
const digitsOnly = (s: string) => s.replace(/[\s.\-()]/g, "");
/** Séquence d'au moins 8 chiffres (numéros de téléphone), séparateurs usuels ignorés. */
const PHONE = /\+?\d{8,}/;

export type MessageProblem = "empty" | "tooLong" | "link" | "phone";

/** Messagerie : texte seul. Liens, adresses e-mail, identifiants de réseaux et numéros de téléphone sont refusés. */
export function validateMessage(raw: string, max: number = LIMITS.messageMax): Valid | Invalid<MessageProblem> {
  const text = raw.trim();
  if (!text) return { ok: false, reason: "empty" };
  if (text.length > max) return { ok: false, reason: "tooLong" };
  if (LINK.test(text) || HANDLE.test(text)) return { ok: false, reason: "link" };
  if (PHONE.test(digitsOnly(text))) return { ok: false, reason: "phone" };
  return { ok: true, text };
}

/** Message d'introduction d'une demande de contact (facultatif, mêmes règles, 140 caractères). */
export function validateIntro(raw: string): Valid | Invalid<MessageProblem> {
  if (!raw.trim()) return { ok: true, text: "" };
  return validateMessage(raw, LIMITS.introMax);
}

export type PseudoProblem = "short" | "long" | "chars";
export function validatePseudo(raw: string): Valid | Invalid<PseudoProblem> {
  const text = raw.trim();
  if (text.length < LIMITS.pseudoMin) return { ok: false, reason: "short" };
  if (text.length > LIMITS.pseudoMax) return { ok: false, reason: "long" };
  if (!/^[\p{L}\p{N} ._'-]+$/u.test(text) || LINK.test(text) || HANDLE.test(text)) return { ok: false, reason: "chars" };
  return { ok: true, text };
}

/* ---------- Quotas et limites de débit ---------- */
const DAY = 86_400_000;

/** Demandes de contact envoyées sur les dernières 24 h glissantes. */
export const requestsToday = (sentAt: number[], now: number) => sentAt.filter((t) => now - t < DAY).length;
export const requestsRemaining = (sentAt: number[], now: number) => Math.max(0, LIMITS.requestsPerDay - requestsToday(sentAt, now));

export type RequestBlock = "quota" | "pending" | "self" | "blocked" | "already";
/** Une nouvelle demande est-elle autorisée ? */
export function canRequestContact(args: { sentAt: number[]; pendingCount: number; now: number; alreadyLinked: boolean; blocked: boolean; self: boolean }): { ok: true } | Invalid<RequestBlock> {
  if (args.self) return { ok: false, reason: "self" };
  if (args.blocked) return { ok: false, reason: "blocked" };
  if (args.alreadyLinked) return { ok: false, reason: "already" };
  if (args.pendingCount >= LIMITS.pendingMax) return { ok: false, reason: "pending" };
  if (requestsRemaining(args.sentAt, args.now) <= 0) return { ok: false, reason: "quota" };
  return { ok: true };
}

/** Trop de messages en peu de temps ? (fenêtre glissante) */
export const isRateLimited = (messageTimes: number[], now: number) => messageTimes.filter((t) => now - t < LIMITS.burstWindowMs).length >= LIMITS.burstMessages;

/** Après un refus, une nouvelle demande est possible au bout de 30 jours (le refus reste silencieux pour le demandeur). */
export const declineRetryAt = (declinedAt: number) => declinedAt + LIMITS.declineRetryDays * DAY;

/* ---------- Annuaire ---------- */
export type DirectoryMember = { id: string; pseudo: string; city: string; genres: string[]; bio: string; visible: boolean };

export const commonGenres = (a: string[], b: string[]) => a.filter((g) => b.includes(g));

/**
 * Annuaire : profils VISIBLES uniquement, hors bloqués et hors soi-même ; ordre ALPHABÉTIQUE (aucun classement, aucun « score »).
 * Les profils non visibles ne sont jamais retournés (filtrage côté serveur dans la version réelle).
 */
export function searchDirectory(members: DirectoryMember[], q: { text: string; city: string; genres: string[]; blocked: string[]; selfId?: string }): DirectoryMember[] {
  const text = q.text.trim().toLowerCase();
  return members
    .filter((m) => m.visible && m.id !== q.selfId && !q.blocked.includes(m.id))
    .filter((m) => !q.city || m.city === q.city)
    .filter((m) => q.genres.length === 0 || q.genres.some((g) => m.genres.includes(g)))
    .filter((m) => !text || `${m.pseudo} ${m.city}`.toLowerCase().includes(text))
    .sort((a, b) => a.pseudo.localeCompare(b.pseudo, "fr"));
}
