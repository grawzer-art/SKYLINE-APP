/**
 * NOTIFICATIONS — règles pures et contrats communs STAFF + participants (aucune dépendance React / stockage / réseau).
 *
 * SÉPARATION STRICTE DES DESTINATAIRES : un message a UNE audience (`staff` | `participants`) ou un destinataire nominatif. Les catégories STAFF et
 * participants sont deux ensembles distincts qui ne se croisent jamais. Les droits sont revérifiés par la base (voir la migration proposée
 * supabase/proposals/B3_1_agenda_notifications.sql) : ce module n'en est que le reflet.
 *
 * AUCUN FAUX ÉVÉNEMENT : la boîte STAFF est DÉRIVÉE des missions réelles (historique B2, commentaires, échéances). Les seules entrées fictives
 * sont des exemples de démonstration, toujours marqués `sample: true` et affichés avec un badge « Exemple ».
 */
import { daysBetween, toISO } from "./agenda.ts";
import type { Actor, Mission } from "./missions.ts";

export type Audience = "staff" | "participants";
export const AUDIENCE_LABEL: Record<Audience, string> = { staff: "Équipe STAFF", participants: "Tous les participants" };

/* ====================================================================== STAFF */
export type StaffCategory = "missions" | "proposals" | "validations" | "comments" | "reminders" | "announcements";
export const STAFF_CATEGORIES: readonly { id: StaffCategory; label: string; hint: string }[] = [
  { id: "missions", label: "Missions", hint: "Une mission vous est confiée" },
  { id: "proposals", label: "Propositions", hint: "Propositions d'attribution et leur issue" },
  { id: "validations", label: "Validations", hint: "Missions à valider, validées ou renvoyées" },
  { id: "comments", label: "Commentaires", hint: "Nouveaux commentaires sur vos missions" },
  { id: "reminders", label: "Rappels", hint: "Échéances proches ou dépassées" },
  { id: "announcements", label: "Annonces", hint: "Annonces de l'organisation (les urgentes s'affichent toujours)" },
];
export type ReminderLead = "same_day" | "day_before" | "two_days";
export const REMINDER_LEAD_LABEL: Record<ReminderLead, string> = { same_day: "Le jour même", day_before: "La veille", two_days: "2 jours avant" };
const LEAD_DAYS: Record<ReminderLead, number> = { same_day: 0, day_before: 1, two_days: 2 };

/** Préférences : stockées sur l'appareil en phase 1 ; table `notification_preferences` proposée pour la suite. `push` = intention de l'utilisateur, sans envoi réel. */
export type StaffPrefs = { categories: Record<StaffCategory, boolean>; reminderLead: ReminderLead; push: boolean };
export const defaultStaffPrefs = (): StaffPrefs => ({ categories: { missions: true, proposals: true, validations: true, comments: true, reminders: true, announcements: true }, reminderLead: "day_before", push: false });
/** Merge défensif (stockage ancien ou corrompu) : toute valeur inconnue retombe sur le défaut. */
export function normalizeStaffPrefs(raw: unknown): StaffPrefs {
  const d = defaultStaffPrefs(); if (!raw || typeof raw !== "object") return d; const r = raw as Partial<StaffPrefs>;
  const categories = { ...d.categories }; for (const c of STAFF_CATEGORIES) if (typeof r.categories?.[c.id] === "boolean") categories[c.id] = r.categories[c.id];
  return { categories, reminderLead: r.reminderLead && r.reminderLead in LEAD_DAYS ? r.reminderLead : d.reminderLead, push: r.push === true };
}

export type NotificationItem = {
  /** Identifiant STABLE (le même évènement donne toujours le même id : l'état lu/non lu en dépend). */
  id: string; category: StaffCategory; title: string; body: string; at: string;
  /** Lien vers l'élément concerné (page STAFF), ou null. */
  href: string | null; urgent?: boolean;
  /** Exemple de démonstration (jamais présenté comme réel). */
  sample?: boolean;
};
export type CommentLike = { id: string; missionId: string; authorId: string; body: string; createdAt: string };

/** Les annonces URGENTES ne peuvent pas être masquées par les préférences. */
export const isVisible = (n: NotificationItem, prefs: StaffPrefs) => (n.category === "announcements" && n.urgent) || prefs.categories[n.category];
export const unreadCount = (list: NotificationItem[], read: ReadonlySet<string>) => list.filter((n) => !read.has(n.id)).length;

const WINDOW_DAYS = 30; const trunc = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const link = (m: Mission) => `/staff/missions?mission=${encodeURIComponent(m.id)}`;

/**
 * Boîte de réception STAFF DÉRIVÉE des données réelles. Règles :
 *  - jamais de notification pour ses PROPRES actions ;
 *  - seulement des évènements des 30 derniers jours ;
 *  - une notification n'existe que pour quelqu'un que l'évènement CONCERNE (responsable, créateur, validateur, personne proposée, coordinateur).
 */
export function deriveStaffNotifications(input: { missions: Mission[]; actor: Actor; name: (id: string) => string; now: number; comments?: CommentLike[] }): NotificationItem[] {
  const { actor: me, name, now } = input; const since = now - WINDOW_DAYS * 86_400_000; const out: NotificationItem[] = [];
  const mine = (m: Mission) => m.assigneeId === me.memberId || m.creatorId === me.memberId || m.validatorId === me.memberId;
  const byId = new Map(input.missions.map((m) => [m.id, m]));
  const add = (n: NotificationItem) => out.push(n);

  for (const m of input.missions) {
    if (m.archivedAt) continue;
    for (const h of m.history) {
      if (h.by === me.memberId || Date.parse(h.at) < since) continue;
      const who = name(h.by); const base = { at: h.at, href: link(m) }; const id = `ev:${m.id}:${h.id}`; const t = `« ${trunc(m.title, 60)} »`;
      switch (h.kind) {
        case "created": if (m.assigneeId === me.memberId) add({ ...base, id, category: "missions", title: "Nouvelle mission", body: `${who} vous a confié ${t}.` }); break;
        case "reassigned": if (h.note === me.memberId) add({ ...base, id, category: "missions", title: "Mission attribuée", body: `${who} vous a attribué ${t}.` }); break;
        case "assignment_proposed":
          if (me.coordinator && m.proposedAssigneeId && m.proposedAssigneeId === h.note) add({ ...base, id, category: "proposals", title: "Proposition à traiter", body: `${who} propose ${name(h.note)} pour ${t}.`, urgent: false });
          else if (!me.coordinator && h.note === me.memberId) add({ ...base, id, category: "proposals", title: "On vous propose une mission", body: `${who} propose de vous confier ${t} (en attente d'un administrateur).` });
          break;
        case "assignment_approved": if (mine(m)) add({ ...base, id, category: "proposals", title: "Proposition acceptée", body: `${t} est attribuée à ${name(m.assigneeId)}.` }); break;
        case "assignment_rejected": if (m.creatorId === me.memberId || m.assigneeId === me.memberId) add({ ...base, id, category: "proposals", title: "Proposition refusée", body: `La proposition pour ${t} n'a pas été retenue.` }); break;
        case "status": if (h.to === "review" && m.status === "review" && (m.validatorId === me.memberId || me.coordinator)) add({ ...base, id, category: "validations", title: "À valider", body: `${who} a envoyé ${t} en validation.` }); break;
        case "validated": if (m.assigneeId === me.memberId || m.creatorId === me.memberId) add({ ...base, id, category: "validations", title: "Mission validée", body: `${who} a validé ${t}.` }); break;
        case "returned": if (m.assigneeId === me.memberId) add({ ...base, id, category: "validations", title: "Renvoyée en cours", body: `${who} a renvoyé ${t} en cours${h.note ? ` : « ${trunc(h.note, 60)} »` : ""}.` }); break;
        default: break; // modifications, archivage, simples changements de statut : pas de notification (bruit)
      }
    }
  }
  for (const c of input.comments ?? []) {
    const m = byId.get(c.missionId); if (!m || m.archivedAt || c.authorId === me.memberId || Date.parse(c.createdAt) < since || !mine(m)) continue;
    add({ id: `co:${c.id}`, category: "comments", title: `Commentaire de ${name(c.authorId)}`, body: `${trunc(c.body, 90)} — ${trunc(m.title, 50)}`, at: c.createdAt, href: link(m) });
  }
  return out.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

/** Rappels d'échéance (séparés : ils dépendent de la date du jour et du délai choisi). Seulement MES missions non terminées. */
export function deriveReminders(input: { missions: Mission[]; actor: Actor; now: number; lead: ReminderLead }): NotificationItem[] {
  const today = toISO(new Date(input.now)); const lead = LEAD_DAYS[input.lead]; const out: NotificationItem[] = [];
  for (const m of input.missions) {
    if (m.archivedAt || m.status === "done" || !m.dueDate || m.assigneeId !== input.actor.memberId) continue;
    const d = daysBetween(today, m.dueDate); const base = { category: "reminders" as const, href: link(m), at: `${today}T00:00:00` };
    const when = m.dueTime ? ` à ${m.dueTime.replace(":", "h")}` : "";
    if (d < 0) out.push({ ...base, id: `late:${m.id}:${m.dueDate}`, title: "Mission en retard", body: `« ${trunc(m.title, 60)} » : échéance dépassée de ${-d} j.`, urgent: true });
    else if (d <= lead) out.push({ ...base, id: `due:${m.id}:${m.dueDate}`, title: d === 0 ? "Échéance aujourd'hui" : d === 1 ? "Échéance demain" : `Échéance dans ${d} jours`, body: `« ${trunc(m.title, 60)} »${when}.` });
  }
  return out;
}

/* =========================================================== Annonces (STAFF → équipe ou participants) */
export const ANNOUNCEMENT_LIMITS = { title: 80, body: 280 } as const;
export type AnnouncementDraft = { audience: Audience; title: string; body: string; urgent: boolean };
export type AnnouncementErrors = Partial<Record<"title" | "body", string>>;
export function validateAnnouncement(d: AnnouncementDraft): { ok: true; value: AnnouncementDraft } | { ok: false; errors: AnnouncementErrors } {
  const errors: AnnouncementErrors = {}; const title = d.title.trim(); const body = d.body.trim();
  if (!title) errors.title = "Le titre est obligatoire."; else if (title.length > ANNOUNCEMENT_LIMITS.title) errors.title = `${ANNOUNCEMENT_LIMITS.title} caractères maximum.`;
  if (!body) errors.body = "Le message est obligatoire."; else if (body.length > ANNOUNCEMENT_LIMITS.body) errors.body = `${ANNOUNCEMENT_LIMITS.body} caractères maximum.`;
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: { ...d, title, body } };
}
/** L'envoi d'une annonce (équipe OU tous les participants) est RÉSERVÉ aux administrateurs (admin STAFF, super admin). La base revérifie. */
export const canSendAnnouncement = (a: Pick<Actor, "coordinator">, audience: Audience) => a.coordinator === true && (audience === "staff" || audience === "participants");
/** Toute annonce exige une confirmation explicite ; l'envoi global aux participants demande en plus une case dédiée. */
export const confirmationLabel = (audience: Audience) => (audience === "participants" ? "Je confirme l'envoi à tous les participants" : "Je confirme l'envoi à toute l'équipe STAFF");

/** Exemples STAFF de démonstration (jamais en mode base de données) : badge « Exemple » obligatoire. */
export const staffSamples = (now: number): NotificationItem[] => {
  const iso = (h: number) => new Date(now - h * 3_600_000).toISOString();
  return [
    { id: "sample:1", category: "announcements", title: "Exemple d'annonce prioritaire", body: "Texte fictif : ici s'afficherait une consigne officielle.", at: iso(2), href: null, urgent: true, sample: true },
    { id: "sample:2", category: "validations", title: "Exemple de mission à valider", body: "Texte fictif : une mission vous attend en validation.", at: iso(5), href: "/staff/missions", sample: true },
    { id: "sample:3", category: "reminders", title: "Exemple d'échéance demain", body: "Texte fictif : rappel avant une échéance.", at: iso(20), href: "/staff/schedule", sample: true },
  ];
};
