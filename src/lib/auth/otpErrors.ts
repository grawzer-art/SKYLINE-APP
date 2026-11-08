/**
 * Classement des erreurs Supabase Auth pour la connexion / l'inscription par code e-mail — logique PURE, testée sans navigateur.
 * RÈGLES
 *  1. Une erreur n'est JAMAIS présentée comme un envoi réussi : seules les erreurs « compte inconnu / banni » (classe NEUTRE) reçoivent le message neutre
 *     « Si ce compte existe… », identique au succès, pour ne pas révéler l'existence d'une adresse (anti-énumération). Toute autre erreur (débit, réseau, serveur,
 *     CAPTCHA, adresse invalide, configuration) reste sur l'étape de saisie de l'e-mail avec un message explicite.
 *  2. Aucun texte brut du serveur n'est affiché.
 *  3. Pour l'inscription (création autorisée), « inscriptions désactivées » est un état GLOBAL du projet (pas une information sur un compte) : message dédié.
 */
export type AuthErrLike = { status?: number; code?: string; name?: string; message?: string } | null | undefined;
export type SendKind = "sent" | "neutral" | "rate" | "captcha" | "invalid_email" | "signup_closed" | "unavailable" | "network" | "unknown";
export type VerifyKind = "ok" | "invalid" | "rate" | "unavailable" | "network" | "unknown";

export const NEUTRAL_MESSAGE = "Si ce compte existe, un code vient d'être envoyé par e-mail.";
const SEND_MESSAGES: Record<Exclude<SendKind, "sent" | "neutral">, string> = {
  rate: "Trop de tentatives. Réessayez dans quelques minutes.",
  captcha: "Le contrôle anti-robot a échoué. Validez-le de nouveau puis réessayez.",
  invalid_email: "Saisissez une adresse e-mail valide.",
  signup_closed: "L'inscription n'est pas disponible pour le moment.",
  unavailable: "Le service est momentanément indisponible. Réessayez dans quelques minutes.",
  network: "Connexion impossible. Vérifiez votre réseau puis réessayez.",
  unknown: "L'envoi du code a échoué. Réessayez dans un instant.",
};
const VERIFY_MESSAGES: Record<Exclude<VerifyKind, "ok">, string> = {
  invalid: "Code invalide ou expiré.",
  rate: "Trop de tentatives. Réessayez dans quelques minutes.",
  unavailable: "Le service est momentanément indisponible. Réessayez dans quelques minutes.",
  network: "Vérification impossible : connexion indisponible. Réessayez.",
  unknown: "Vérification impossible pour le moment. Réessayez.",
};
const c = (e: NonNullable<AuthErrLike>) => String(e.code ?? "").toLowerCase(); const m = (e: NonNullable<AuthErrLike>) => String(e.message ?? "");
const isNetwork = (e: NonNullable<AuthErrLike>) => e.name === "AuthRetryableFetchError" && (e.status === 0 || e.status === undefined) || e.status === 0 || (e.status === undefined && /failed to fetch|fetch failed|network|load failed/i.test(m(e)));
const isRate = (e: NonNullable<AuthErrLike>) => e.status === 429 || /^over_(request|email_send|sms_send)_rate_limit$/.test(c(e)) || /rate limit|too many requests/i.test(m(e));

export function classifySendError(err: AuthErrLike, mode: "login" | "signup"): { kind: SendKind; message: string } {
  if (!err) return { kind: "sent", message: NEUTRAL_MESSAGE };
  const e = err;
  const out = (kind: Exclude<SendKind, "sent" | "neutral">) => ({ kind, message: SEND_MESSAGES[kind] });
  if (isNetwork(e)) return out("network");
  if (isRate(e)) return out("rate");
  if (c(e) === "captcha_failed" || /captcha/i.test(m(e))) return out("captcha");
  if (c(e) === "email_address_invalid" || (c(e) === "validation_failed" && /email/i.test(m(e)))) return out("invalid_email");
  // Classe NEUTRE : n'indique rien sur un compte précis (compte inconnu, banni). Même message que le succès.
  if (["user_not_found", "user_banned"].includes(c(e)) || /user not found|user.*banned/i.test(m(e))) return { kind: "neutral", message: NEUTRAL_MESSAGE };
  // Création / connexion désactivées : en connexion (création interdite) un compte inconnu produit cette erreur ⇒ NEUTRE ; en inscription c'est l'état global « inscriptions fermées ».
  if (["otp_disabled", "signup_disabled"].includes(c(e)) || /signups? not allowed|signup.*disabled|otp.*disabled/i.test(m(e))) return mode === "login" ? { kind: "neutral", message: NEUTRAL_MESSAGE } : out("signup_closed");
  if (c(e) === "email_address_not_authorized" || (e.status !== undefined && e.status >= 500) || ["unexpected_failure", "request_timeout", "hook_timeout", "hook_timeout_after_retry", "email_provider_disabled"].includes(c(e))) return out("unavailable");
  return out("unknown");
}
export function classifyVerifyError(err: AuthErrLike): { kind: VerifyKind; message: string } {
  if (!err) return { kind: "ok", message: "" };
  const e = err; const out = (kind: Exclude<VerifyKind, "ok">) => ({ kind, message: VERIFY_MESSAGES[kind] });
  if (isNetwork(e)) return out("network");
  if (isRate(e)) return out("rate");
  if (e.status !== undefined && e.status >= 500) return out("unavailable");
  if (["otp_expired", "invalid_credentials", "user_banned", "user_not_found", "validation_failed", "flow_state_expired", "flow_state_not_found"].includes(c(e)) || /expired|invalid|otp|token/i.test(m(e)) || (e.status !== undefined && [400, 401, 403, 404, 422].includes(e.status))) return out("invalid");
  return out("unknown");
}
