/**
 * INSCRIPTION PUBLIQUE des participants (B4.2). FERMÉE par défaut.
 *  - PARTICIPANT_SIGNUP absente ou « off » : /v3/signup n'existe pas (404), aucun lien d'inscription, aucune création de compte possible depuis l'interface.
 *  - PARTICIPANT_SIGNUP=on : exige PARTICIPANT_AUTH=supabase, la version et l'adresse des CGU (PARTICIPANT_TERMS_VERSION / PARTICIPANT_TERMS_URL) et un CAPTCHA
 *    (PARTICIPANT_CAPTCHA_PROVIDER=turnstile|hcaptcha + PARTICIPANT_CAPTCHA_SITE_KEY ; « none » explicite pour un environnement local / de test uniquement :
 *    REFUSÉ dès que VERCEL_ENV vaut preview ou production — et tout VERCEL_ENV inconnu est traité comme un déploiement).
 * Les textes juridiques (CGU, charte) ne sont PAS dans le code : seules leurs adresses et leur version sont configurées. Aucune valeur par défaut inventée.
 * RÈGLE (comme B2 / B4.1) : une configuration demandée mais incorrecte n'est jamais corrigée en silence : erreur explicite, limitée aux pages d'inscription.
 */
export type CaptchaConfig = { provider: "turnstile" | "hcaptcha"; siteKey: string } | null;
export type SignupConfig =
  | { mode: "off"; issue: null }
  | { mode: "misconfigured"; issue: string }
  | { mode: "on"; issue: null; termsVersion: string; termsUrl: string; charterUrl: string | null; minAge: number; captcha: CaptchaConfig };
export type SignupEnv = {
  PARTICIPANT_SIGNUP?: string; participantMode: "off" | "supabase" | "misconfigured";
  PARTICIPANT_TERMS_VERSION?: string; PARTICIPANT_TERMS_URL?: string; PARTICIPANT_CHARTER_URL?: string; PARTICIPANT_MIN_AGE?: string;
  PARTICIPANT_CAPTCHA_PROVIDER?: string; PARTICIPANT_CAPTCHA_SITE_KEY?: string;
  /** Environnement de déploiement Vercel (VERCEL_ENV : production | preview | development). Absent hors Vercel (local, tests). */
  VERCEL_ENV?: string;
};
/** Adresse de document : https:// ou chemin interne. Jamais javascript:, data:, // ni caractère de contrôle. */
export const safeDocUrl = (u: string | undefined): string | null => {
  const v = (u ?? "").trim(); if (!v || v.length > 300 || /[\u0000-\u001f\s]/.test(v)) return null;
  if (/^https:\/\/[A-Za-z0-9.-]+(:\d+)?(\/[^\s]*)?$/.test(v)) return v;
  return /^\/(?!\/)[A-Za-z0-9\-_./%]*$/.test(v) && !v.includes("..") ? v : null;
};
export function evaluateSignupConfig(e: SignupEnv): SignupConfig {
  const raw = (e.PARTICIPANT_SIGNUP ?? "") === "" ? "off" : e.PARTICIPANT_SIGNUP;
  if (raw === "off") return { mode: "off", issue: null };
  const bad = (issue: string): SignupConfig => ({ mode: "misconfigured", issue });
  if (raw !== "on") return bad("PARTICIPANT_SIGNUP a une valeur non reconnue (attendu : « off » ou « on »).");
  if (e.participantMode !== "supabase") return bad("PARTICIPANT_SIGNUP=on exige PARTICIPANT_AUTH=supabase (avec l'URL et la clé publique Supabase).");
  const termsVersion = (e.PARTICIPANT_TERMS_VERSION ?? "").trim(); if (!/^[A-Za-z0-9._-]{1,40}$/.test(termsVersion)) return bad("PARTICIPANT_TERMS_VERSION est absente ou invalide (1 à 40 caractères : lettres, chiffres, . _ -).");
  const termsUrl = safeDocUrl(e.PARTICIPANT_TERMS_URL); if (!termsUrl) return bad("PARTICIPANT_TERMS_URL est absente ou invalide (adresse https:// ou chemin interne).");
  let charterUrl: string | null = null; if ((e.PARTICIPANT_CHARTER_URL ?? "").trim()) { charterUrl = safeDocUrl(e.PARTICIPANT_CHARTER_URL); if (!charterUrl) return bad("PARTICIPANT_CHARTER_URL est invalide (adresse https:// ou chemin interne)."); }
  const ageRaw = (e.PARTICIPANT_MIN_AGE ?? "").trim(); const minAge = ageRaw === "" ? 18 : Number(ageRaw);
  if (!Number.isInteger(minAge) || minAge < 16 || minAge > 99) return bad("PARTICIPANT_MIN_AGE est invalide (entier de 16 à 99 ; 18 par défaut).");
  const prov = (e.PARTICIPANT_CAPTCHA_PROVIDER ?? "").trim(); let captcha: CaptchaConfig = null;
  if (prov === "") return bad("PARTICIPANT_CAPTCHA_PROVIDER est requis (turnstile ou hcaptcha ; « none » uniquement pour un environnement local ou de test).");
  if (prov === "turnstile" || prov === "hcaptcha") { const key = (e.PARTICIPANT_CAPTCHA_SITE_KEY ?? "").trim(); if (!/^[A-Za-z0-9_-]{8,100}$/.test(key)) return bad("PARTICIPANT_CAPTCHA_SITE_KEY est absente ou invalide."); captcha = { provider: prov, siteKey: key }; }
  else if (prov === "none") { const dep = (e.VERCEL_ENV ?? "").trim().toLowerCase(); if (dep !== "" && dep !== "development") return bad("PARTICIPANT_CAPTCHA_PROVIDER=none est interdit sur un déploiement Preview ou Production : configurez turnstile ou hcaptcha."); }
  else return bad("PARTICIPANT_CAPTCHA_PROVIDER a une valeur non reconnue (attendu : turnstile, hcaptcha ou none).");
  return { mode: "on", issue: null, termsVersion, termsUrl, charterUrl, minAge, captcha };
}
