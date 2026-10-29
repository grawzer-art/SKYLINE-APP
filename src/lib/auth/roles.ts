/**
 * TROIS NOTIONS DISTINCTES — jamais mélangées (miroir exact de supabase/migrations) :
 *  1. RÔLE GLOBAL (`platform`) : `super_admin` = propriétaire de SKYLINE APP (GRAW). Administre comptes, invitations, activations,
 *     accès et rôles de TOUS les espaces. Ce n'est pas, à lui seul, une permission STAFF HQ.
 *  2. ACCÈS PAR ESPACE (`spaces`) : `staff` (STAFF HQ) et/ou `members` (participants MEMBERS). Un compte peut CUMULER plusieurs accès.
 *  3. PERMISSIONS STAFF HQ (`staff`) : `admin` (TOM) ou `member` (QAFARD) — uniquement pour un compte ayant l'accès `staff`.
 * Un participant (accès `members` seul) n'a AUCUN droit STAFF. Les FONCTIONS professionnelles (photographe, direction artistique…)
 * décrivent un métier (`src/data/staff.ts`) : elles ne donnent aucun droit. La base de données reste la source de vérité.
 */
export const PLATFORM_ROLES = ["super_admin"] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];
export const STAFF_ROLES = ["admin", "member"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];
export const SPACES = ["staff", "members"] as const;
export type Space = (typeof SPACES)[number];

export type Access = { platform: PlatformRole[]; spaces: Space[]; staff: StaffRole[] };
export const NO_ACCESS: Access = { platform: [], spaces: [], staff: [] };

/** Session de DÉMONSTRATION : aucun vrai compte n'existe encore. Remplacée par l'authentification Supabase (mode supabase). */
export type DemoSession = { sub: string; name: string; access: Access; /** Membre de l'équipe STAFF HQ associé au compte (absent pour un participant). */ memberId?: string; demo: true; iat: number; exp: number };

export const isSuperAdmin = (a: Access | undefined) => !!a?.platform.includes("super_admin");
export const hasSpace = (a: Access | undefined, s: Space) => !!a?.spaces.includes(s);
/** STAFF HQ : accès `staff` ET (permission STAFF ou super admin). Un participant seul n'y entre jamais. */
export const canEnterStaff = (a: Access | undefined) => hasSpace(a, "staff") && (isSuperAdmin(a) || (a?.staff.length ?? 0) > 0);
/** Coordination STAFF (toutes les missions, attributions, validations) : permission `admin`, ou super admin ayant l'accès `staff`. */
export const isCoordinator = (a: Access | undefined) => hasSpace(a, "staff") && (isSuperAdmin(a) || !!a?.staff.includes("admin"));
/** Administration des comptes, invitations, activations, accès et rôles : super admin GLOBAL uniquement. */
export const canManageAccounts = (a: Access | undefined) => isSuperAdmin(a);
/** Espace MEMBERS (participants) : accès `members` explicite, indépendant des droits STAFF. */
export const canEnterMembers = (a: Access | undefined) => hasSpace(a, "members");
/** Libellés d'affichage des droits (rôle global, puis permissions STAFF). */
export const accessLabels = (a: Access | undefined): string[] => [...(a?.platform ?? []), ...(a?.staff ?? [])];

export type DemoAccount = { id: string; label: string; hint: string; name: string; access: Access; memberId?: string };
/** Comptes fictifs pour la démonstration (aucun mot de passe). Équipe active : TOM, GRAW, QAFARD uniquement. */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  { id: "participant", label: "Participant", hint: "Accès MEMBERS uniquement", name: "Alex (démo)", access: { platform: [], spaces: ["members"], staff: [] } },
  { id: "tom", label: "Tom", hint: "Fondateur · admin STAFF", name: "Tom", access: { platform: [], spaces: ["staff"], staff: ["admin"] }, memberId: "tom" },
  { id: "graw", label: "Graw", hint: "Directeur Artistique & Digital · super admin global · aussi MEMBERS", name: "Graw", access: { platform: ["super_admin"], spaces: ["staff", "members"], staff: [] }, memberId: "graw" },
  { id: "qafard", label: "Qafard", hint: "Photographe · member STAFF", name: "Qafard", access: { platform: [], spaces: ["staff"], staff: ["member"] }, memberId: "qafard" },
];
