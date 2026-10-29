import type { Role } from "@/lib/auth/roles";

/**
 * STAFF HQ — DONNÉES DE DÉMONSTRATION. Tout est fictif : aucun nom, horaire, coordonnée ou message réel.
 * En production, ces données viennent de la base commune (voir docs/skyline-staff/ARCHITECTURE.md).
 */
export const STAFF_DEMO_NOTICE = "Données de démonstration — contenus fictifs";

/** FONCTION (métier) : ne donne AUCUN droit. Les droits viennent des rôles de sécurité (`accessRoles`). */
export type StaffFunction = "Direction artistique" | "Photographe" | "Communication" | "Logistique" | "Production" | "Accueil participants" | "Partenaires";
export const staffFunctions: StaffFunction[] = ["Direction artistique", "Photographe", "Communication", "Logistique", "Production", "Accueil participants", "Partenaires"];

export type StaffMember = {
  id: string; name: string; functions: StaffFunction[]; responsibilities: string[];
  /** Rôles de sécurité du compte (affichés séparément des fonctions). */
  accessRoles: Role[];
  /** Coordonnées : affichées uniquement si la personne a donné son accord (`allowed`). */
  contact: { allowed: boolean; email?: string };
};
export const staffMembers: StaffMember[] = [
  { id: "st1", name: "Camille R.", functions: ["Direction artistique"], responsibilities: ["Cohérence visuelle de l'édition", "Validation des supports"], accessRoles: ["staff", "admin"], contact: { allowed: true, email: "camille@exemple.invalid" } },
  { id: "st2", name: "Noé B.", functions: ["Production"], responsibilities: ["Coordination générale", "Planning opérationnel"], accessRoles: ["staff", "admin"], contact: { allowed: false } },
  { id: "st3", name: "Inès L.", functions: ["Communication"], responsibilities: ["Annonces participants", "SKYLINE SIGNAL"], accessRoles: ["staff"], contact: { allowed: false } },
  { id: "st4", name: "Léo M.", functions: ["Photographe"], responsibilities: ["Couverture photo", "Autorisations d'image"], accessRoles: ["staff"], contact: { allowed: false } },
  { id: "st5", name: "Maëlys T.", functions: ["Logistique"], responsibilities: ["Transferts", "Hébergements"], accessRoles: ["staff"], contact: { allowed: false } },
  { id: "st6", name: "Sasha P.", functions: ["Accueil participants"], responsibilities: ["Point de rendez-vous", "Questions participants"], accessRoles: ["staff"], contact: { allowed: false } },
  { id: "st7", name: "Alba V.", functions: ["Partenaires", "Communication"], responsibilities: ["Relation partenaires", "Contenus partenaires"], accessRoles: ["staff"], contact: { allowed: false } },
];
export const getStaffMember = (id: string) => staffMembers.find((m) => m.id === id);
export const initials = (n: string) => n.trim().slice(0, 1).toUpperCase();

export type ScheduleStatus = "planned" | "preparing" | "confirmed";
export const scheduleStatusLabel: Record<ScheduleStatus, string> = { planned: "À planifier", preparing: "En préparation", confirmed: "Confirmé" };
export type ScheduleItem = { id: string; phase: "Préparation" | "Veille" | "Sur place"; when: string; time: string; title: string; ownerId: string; status: ScheduleStatus; place: string };
/** Échéances RELATIVES (J-n) et heures « --:-- » : aucun horaire réel n'est confirmé dans la démonstration. */
export const schedule: ScheduleItem[] = [
  { id: "sc1", phase: "Préparation", when: "J-45", time: "--:--", title: "Validation des supports de communication", ownerId: "st1", status: "preparing", place: "À définir" },
  { id: "sc2", phase: "Préparation", when: "J-30", time: "--:--", title: "Plan de transferts participants", ownerId: "st5", status: "planned", place: "À définir" },
  { id: "sc3", phase: "Préparation", when: "J-14", time: "--:--", title: "Briefing équipe : rôles et responsabilités", ownerId: "st2", status: "planned", place: "À définir" },
  { id: "sc4", phase: "Veille", when: "J-1", time: "--:--", title: "Point de rendez-vous participants", ownerId: "st6", status: "planned", place: "À définir" },
  { id: "sc5", phase: "Veille", when: "J-1", time: "--:--", title: "Vérification des accès et listes", ownerId: "st2", status: "planned", place: "À définir" },
  { id: "sc6", phase: "Sur place", when: "Jour J", time: "--:--", title: "Accueil et départ du groupe", ownerId: "st6", status: "planned", place: "À définir" },
  { id: "sc7", phase: "Sur place", when: "Jour J", time: "--:--", title: "Couverture photo de l'expérience", ownerId: "st4", status: "planned", place: "À définir" },
];

export type Announcement = { id: string; title: string; text: string; channel: string; tag: "Priorité" | "Info" };
export const announcements: Announcement[] = [
  { id: "an1", title: "Exemple d'annonce interne prioritaire", text: "Texte fictif : ici s'afficherait une consigne officielle de l'organisation.", channel: "general", tag: "Priorité" },
  { id: "an2", title: "Exemple d'annonce d'équipe", text: "Texte fictif : une information destinée à une équipe précise.", channel: "communication", tag: "Info" },
  { id: "an3", title: "Exemple de rappel logistique", text: "Texte fictif : un rappel sur les transferts ou l'hébergement.", channel: "logistique", tag: "Info" },
];

export type Channel = { id: string; title: string; description: string };
export const channels: Channel[] = [
  { id: "general", title: "Général", description: "Annonces à toute l'organisation" },
  { id: "direction-artistique", title: "Direction artistique", description: "Identité, supports, validations" },
  { id: "photo-video", title: "Photo & vidéo", description: "Couverture, autorisations d'image" },
  { id: "communication", title: "Communication", description: "Annonces participants, SIGNAL" },
  { id: "logistique", title: "Logistique", description: "Transferts, hébergements, accueil" },
];
export const getChannel = (id: string) => channels.find((c) => c.id === id);
