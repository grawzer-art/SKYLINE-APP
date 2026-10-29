/**
 * Rôles de SÉCURITÉ (ce qu'un compte a le droit de faire). Un compte peut en cumuler plusieurs.
 *  - `super_admin` (GRAW) : propriétaire technique ; SEUL à gérer comptes, invitations, désactivations et rôles ; droit d'intervention global.
 *  - `admin` (TOM) : administrateur OPÉRATIONNEL : toutes les missions, projets, plannings et validations ; AUCUN droit sur les comptes ni les permissions.
 *  - `member` (QAFARD) : crée ses missions, gère celles qui lui sont attribuées, propose des missions pour d'autres (validation de l'attribution par un admin).
 *  - `participant` : espace MEMBERS uniquement (démo).
 * À ne pas confondre avec les FONCTIONS du staff (photographe, direction artistique…), qui décrivent un métier et vivent dans
 * `src/data/staff.ts` : aucune fonction ne donne le moindre droit d'accès.
 * Ces règles sont miroir de celles appliquées en base (supabase/migrations) : la base est la source de vérité.
 */
export const ROLES = ["participant", "member", "admin", "super_admin"] as const;
export type Role = (typeof ROLES)[number];

export type DemoSession = { sub: string; name: string; roles: Role[]; /** Membre de l'équipe STAFF HQ associé au compte (absent pour un participant). */ memberId?: string; demo: true; iat: number; exp: number };

export const hasRole = (roles: readonly Role[] | undefined, role: Role) => !!roles?.includes(role);
/** STAFF HQ : réservé aux comptes `member`, `admin` ou `super_admin`. Un participant seul n'y entre jamais. */
export const canEnterStaff = (roles: readonly Role[] | undefined) => hasRole(roles, "member") || hasRole(roles, "admin") || hasRole(roles, "super_admin");
/** Coordination (toutes les missions, attributions, validations) : `admin` et `super_admin`. */
export const isCoordinator = (roles: readonly Role[] | undefined) => hasRole(roles, "admin") || hasRole(roles, "super_admin");
/** Gestion des comptes, invitations, désactivations et rôles : `super_admin` uniquement. */
export const canManageAccounts = (roles: readonly Role[] | undefined) => hasRole(roles, "super_admin");
export const canEnterMembers = (roles: readonly Role[] | undefined) => hasRole(roles, "participant") || canEnterStaff(roles);

export type DemoAccount = { id: string; label: string; hint: string; name: string; roles: Role[]; memberId?: string };
/** Comptes fictifs pour la démonstration (aucune donnée réelle). Équipe active : TOM, GRAW, QAFARD uniquement. */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  { id: "participant", label: "Participant", hint: "Accès MEMBERS uniquement", name: "Alex (démo)", roles: ["participant"] },
  { id: "tom", label: "Tom", hint: "Fondateur · admin opérationnel", name: "Tom", roles: ["admin"], memberId: "tom" },
  { id: "graw", label: "Graw", hint: "Directeur Artistique & Digital · super admin · aussi participant", name: "Graw", roles: ["participant", "super_admin"], memberId: "graw" },
  { id: "qafard", label: "Qafard", hint: "Photographe · member", name: "Qafard", roles: ["member"], memberId: "qafard" },
];
