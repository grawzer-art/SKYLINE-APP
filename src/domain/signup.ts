import { validateProfileInput, type ProfileErrors, type ProfileInput } from "./participant.ts";

export type SignupInput = ProfileInput & { email: string; acceptTerms: boolean; adult: boolean };
export type SignupErrors = ProfileErrors & { email?: string; acceptTerms?: string; adult?: string };
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Validation de confort côté navigateur (la base revalide tout dans `claim_member_account`). `needEmail` est faux pour la finalisation après lien magique. */
export function validateSignupInput(i: SignupInput, o: { needEmail?: boolean; minAge?: number } = {}): { ok: true; value: SignupInput } | { ok: false; errors: SignupErrors } {
  const errors: SignupErrors = {}; const p = validateProfileInput(i); if (!p.ok) Object.assign(errors, p.errors);
  const email = i.email.trim().toLowerCase(); if (o.needEmail !== false && (!EMAIL_RE.test(email) || email.length > 254)) errors.email = "Saisissez une adresse e-mail valide.";
  if (!i.acceptTerms) errors.acceptTerms = "Vous devez accepter les conditions pour créer un compte.";
  if (!i.adult) errors.adult = `Vous devez attester avoir au moins ${o.minAge ?? 18} ans.`;
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: { ...(p.ok ? p.value : i), email, acceptTerms: true, adult: true } };
}
