/**
 * Rôles de SÉCURITÉ (ce qu'un compte a le droit de faire). Un compte peut en cumuler plusieurs.
 * À ne pas confondre avec les FONCTIONS du staff (photographe, direction artistique…), qui décrivent un métier
 * et vivent dans `src/data/staff.ts` : aucune fonction ne donne le moindre droit d'accès.
 */
export const ROLES = ["participant", "staff", "admin"] as const;
export type Role = (typeof ROLES)[number];

/** Session de DÉMONSTRATION : aucun vrai compte n'existe encore. Remplacée par une authentification serveur en production. */
export type DemoSession = { sub: string; name: string; roles: Role[]; /** Membre de l'équipe STAFF HQ associé au compte (absent pour un participant). */ memberId?: string; demo: true; iat: number; exp: number };

export const hasRole = (roles: readonly Role[] | undefined, role: Role) => !!roles?.includes(role);
/** STAFF HQ : réservé aux comptes « staff » ou « admin ». Un participant seul n'y entre jamais. */
export const canEnterStaff = (roles: readonly Role[] | undefined) => hasRole(roles, "staff") || hasRole(roles, "admin");
export const canEnterMembers = (roles: readonly Role[] | undefined) => hasRole(roles, "participant") || canEnterStaff(roles);

export type DemoAccount = { id: string; label: string; hint: string; name: string; roles: Role[]; memberId?: string };
/** Comptes fictifs pour la démonstration (aucune donnée réelle). Équipe active : TOM, GRAW, QAFARD uniquement. */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  { id: "participant", label: "Participant", hint: "Accès MEMBERS uniquement", name: "Alex (démo)", roles: ["participant"] },
  { id: "tom", label: "Tom", hint: "Fondateur · coordination", name: "Tom", roles: ["admin"], memberId: "tom" },
  { id: "graw", label: "Graw", hint: "Directeur Artistique & Digital · coordination · aussi participant", name: "Graw", roles: ["participant", "admin"], memberId: "graw" },
  { id: "qafard", label: "Qafard", hint: "Photographe", name: "Qafard", roles: ["staff"], memberId: "qafard" },
];
