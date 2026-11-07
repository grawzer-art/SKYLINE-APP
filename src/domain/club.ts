/**
 * PROFIL COMMUNAUTAIRE « CLUB » — règles pures (miroir des contraintes de la base, qui reste la source de vérité).
 * Distinct de l'identité privée (`participant.ts`) : pseudo, ville, bio, goûts, photo. Jamais d'e-mail, de nom légal ni de réservation.
 */
import { LIMITS, validatePseudo } from "./community.ts";

export type ClubProfile = { pseudo: string; city: string | null; bio: string; genres: string[]; avatarPath: string | null; visible: boolean };
/** Fiche d'un AUTRE membre : champs publics + identifiant public aléatoire (jamais l'identifiant du compte). */
export type ClubMember = { id: string; pseudo: string; city: string | null; bio: string; genres: string[]; avatarPath: string | null };
export type ClubInput = { pseudo: string; city: string | null; bio: string; genres: string[] };
export type ClubErrors = Partial<Record<keyof ClubInput, string>>;

export const CITY_MAX = 40;
export const AVATAR = { maxBytes: 512 * 1024, maxPixels: 512, inputTypes: ["image/jpeg", "image/png", "image/webp"], inputMaxBytes: 12 * 1024 * 1024 } as const;
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;
const PSEUDO_MSG = { short: "Le pseudo doit contenir au moins 2 caractères.", long: "Le pseudo ne peut pas dépasser 24 caractères.", chars: "Le pseudo ne peut contenir que des lettres, chiffres, espaces et . _ ' - (ni lien, ni @, ni e-mail)." } as const;

export function validateClubInput(i: ClubInput): { ok: true; value: ClubInput } | { ok: false; errors: ClubErrors } {
  const errors: ClubErrors = {};
  const p = validatePseudo(i.pseudo); if (!p.ok) errors.pseudo = PSEUDO_MSG[p.reason];
  const city = (i.city ?? "").trim(); if (city.length > CITY_MAX || CONTROL.test(city)) errors.city = "Ville invalide.";
  const bio = i.bio.trim(); if (bio.length > LIMITS.bioMax) errors.bio = `${LIMITS.bioMax} caractères maximum.`; else if (CONTROL.test(bio)) errors.bio = "Caractères non autorisés.";
  const genres = [...new Set(i.genres.map((g) => g.trim()).filter(Boolean))];
  if (genres.length > LIMITS.genresMax) errors.genres = `${LIMITS.genresMax} goûts maximum.`; else if (genres.some((g) => g.length > 30 || CONTROL.test(g))) errors.genres = "Goût musical invalide.";
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: { pseudo: i.pseudo.trim(), city: city || null, bio, genres } };
}

/** Vérifie un fichier de photo AVANT traitement : type et poids d'entrée (la photo est ensuite recompressée par le navigateur). */
export const checkAvatarInput = (f: { type: string; size: number }): "ok" | "type" | "size" =>
  !(AVATAR.inputTypes as readonly string[]).includes(f.type) ? "type" : f.size > AVATAR.inputMaxBytes ? "size" : "ok";
/** Dimensions de sortie : côté le plus long ramené à `maxPixels`, jamais agrandi. */
export const avatarTarget = (w: number, h: number, max: number = AVATAR.maxPixels) => { const k = Math.min(1, max / Math.max(w, h, 1)); return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) }; };
