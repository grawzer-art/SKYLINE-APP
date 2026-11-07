/**
 * PROFIL PARTICIPANT — règles pures (miroir des contraintes de la base ; la base reste la source de vérité et revalide tout).
 * Aucune identité inventée : sans profil, aucun nom n'est affiché.
 */
export const PROFILE_LIMITS = { first: 60, last: 60, display: 60 } as const;
export type ProfileInput = { firstName: string; lastName: string; displayName: string };
export type ProfileErrors = Partial<Record<keyof ProfileInput, string>>;
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;

const check = (v: string, max: number, label: string) => { const t = v.trim(); if (!t) return `${label} obligatoire.`; if (t.length > max) return `${max} caractères maximum.`; if (CONTROL.test(v)) return "Caractères non autorisés."; return undefined; };
export function validateProfileInput(i: ProfileInput): { ok: true; value: ProfileInput } | { ok: false; errors: ProfileErrors } {
  const errors: ProfileErrors = {};
  const f = check(i.firstName, PROFILE_LIMITS.first, "Le prénom est"); if (f) errors.firstName = f.replace("est obligatoire", "est obligatoire");
  const l = check(i.lastName, PROFILE_LIMITS.last, "Le nom est"); if (l) errors.lastName = l;
  const d = check(i.displayName, PROFILE_LIMITS.display, "Le nom affiché est"); if (d) errors.displayName = d;
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: { firstName: i.firstName.trim(), lastName: i.lastName.trim(), displayName: i.displayName.trim() } };
}
/** Nom affiché proposé par défaut : le prénom. */
export const suggestDisplayName = (firstName: string) => firstName.trim().slice(0, PROFILE_LIMITS.display);
export const initialsOf = (name: string) => name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => Array.from(p)[0]?.toUpperCase() ?? "").join("");
