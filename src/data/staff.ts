import type { Role } from "@/lib/auth/roles";

/**
 * STAFF HQ — DONNÉES DE DÉMONSTRATION. Tout est fictif : aucun nom, horaire, coordonnée ou message réel.
 * En production, ces données viennent de la base commune (voir docs/skyline-staff/ARCHITECTURE.md).
 */
export const STAFF_DEMO_NOTICE = "Données de démonstration — contenus fictifs";

/** FONCTION (métier) : ne donne AUCUN droit. Les droits viennent des rôles de sécurité (`accessRoles`). */
export type StaffFunction = "Fondateur" | "Direction artistique & digital" | "Photographe";
export const staffFunctions: StaffFunction[] = ["Fondateur", "Direction artistique & digital", "Photographe"];

export type StaffMember = {
  id: string; name: string; functions: StaffFunction[]; responsibilities: string[];
  /** Rôles de sécurité du compte (affichés séparément des fonctions). */
  accessRoles: Role[];
  /** Coordonnées : affichées uniquement si la personne a donné son accord (`allowed`). */
  contact: { allowed: boolean; email?: string };
  /**
   * Équipe ACTIVE : seuls les membres `active: true` apparaissent partout (annuaire, missions, responsables).
   * Pour ajouter quelqu'un plus tard : une entrée ici (+ un compte côté serveur), sans toucher au reste de l'application.
   */
  active: boolean;
};
export const staffMembers: StaffMember[] = [
  { id: "tom", name: "Tom", functions: ["Fondateur"], responsibilities: ["Vision et décisions", "Coordination de l'équipe"], accessRoles: ["admin"], contact: { allowed: false }, active: true },
  { id: "graw", name: "Graw", functions: ["Direction artistique & digital"], responsibilities: ["Direction artistique", "Application et digital"], accessRoles: ["super_admin"], contact: { allowed: false }, active: true },
  { id: "qafard", name: "Qafard", functions: ["Photographe"], responsibilities: ["Couverture photo", "Autorisations d'image"], accessRoles: ["member"], contact: { allowed: false }, active: true },
];
/** Équipe active (source unique pour l'annuaire, les responsables de mission et les validateurs). */
export const activeMembers = () => staffMembers.filter((m) => m.active);
/** Validateurs possibles : administrateurs actifs (GRAW `super_admin`, TOM `admin`). */
export const validatorIds = () => activeMembers().filter((m) => m.accessRoles.includes("admin") || m.accessRoles.includes("super_admin")).map((m) => m.id);
export const getStaffMember = (id: string) => staffMembers.find((m) => m.id === id && m.active);
export const initials = (n: string) => n.trim().slice(0, 1).toUpperCase();

export type ScheduleStatus = "planned" | "preparing" | "confirmed";
export const scheduleStatusLabel: Record<ScheduleStatus, string> = { planned: "À planifier", preparing: "En préparation", confirmed: "Confirmé" };
export type ScheduleItem = { id: string; phase: "Préparation" | "Veille" | "Sur place"; when: string; time: string; title: string; ownerId: string; status: ScheduleStatus; place: string };
/** Échéances RELATIVES (J-n) et heures « --:-- » : aucun horaire réel n'est confirmé dans la démonstration. */
export const schedule: ScheduleItem[] = [
  { id: "sc1", phase: "Préparation", when: "J-45", time: "--:--", title: "Validation des supports de communication", ownerId: "graw", status: "preparing", place: "À définir" },
  { id: "sc2", phase: "Préparation", when: "J-30", time: "--:--", title: "Plan de transferts participants", ownerId: "tom", status: "planned", place: "À définir" },
  { id: "sc3", phase: "Préparation", when: "J-14", time: "--:--", title: "Briefing équipe : rôles et responsabilités", ownerId: "tom", status: "planned", place: "À définir" },
  { id: "sc4", phase: "Veille", when: "J-1", time: "--:--", title: "Point de rendez-vous participants", ownerId: "tom", status: "planned", place: "À définir" },
  { id: "sc5", phase: "Veille", when: "J-1", time: "--:--", title: "Vérification des accès et listes", ownerId: "tom", status: "planned", place: "À définir" },
  { id: "sc6", phase: "Sur place", when: "Jour J", time: "--:--", title: "Accueil et départ du groupe", ownerId: "tom", status: "planned", place: "À définir" },
  { id: "sc7", phase: "Sur place", when: "Jour J", time: "--:--", title: "Couverture photo de l'expérience", ownerId: "qafard", status: "planned", place: "À définir" },
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
