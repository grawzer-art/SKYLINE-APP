/**
 * AGENDA OPÉRATIONNEL — règles pures (aucune dépendance React / stockage).
 * PRINCIPE : l'agenda RÉUTILISE les missions B2 (même modèle, mêmes droits, même base). Il ne crée AUCUN second système de tâches :
 *  - une mission est placée sur sa date d'échéance (`dueDate`, heure facultative `dueTime`) ;
 *  - une mission sans date va dans « À planifier » ;
 *  - les réunions et événements sont un type DISTINCT (`AgendaEvent`), jamais mélangé aux missions.
 */
import type { Mission } from "./missions.ts";
import { isTime } from "./missions.ts";

/* ---------- Dates (chaînes AAAA-MM-JJ, sans fuseau : jours calendaires locaux) ---------- */
export const toISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); };
export const addDays = (iso: string, n: number) => { const d = parse(iso); d.setDate(d.getDate() + n); return toISO(d); };
/** Lundi de la semaine contenant `iso`. */
export const startOfWeek = (iso: string) => { const d = parse(iso); const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow); return toISO(d); };
export const weekDays = (iso: string) => { const s = startOfWeek(iso); return Array.from({ length: 7 }, (_, i) => addDays(s, i)); };
export const daysBetween = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / 86_400_000);

/* ---------- Réunions et événements ---------- */
export const EVENT_LIMITS = { title: 80, place: 80 } as const;
export type EventKind = "meeting" | "event";
export const EVENT_KIND_LABEL: Record<EventKind, string> = { meeting: "Réunion", event: "Événement" };
/** `team` : visible dans l'agenda de toute l'équipe ; `me` : personnel. */
export type EventScope = "team" | "me";
export type AgendaEvent = { id: string; title: string; kind: EventKind; date: string; startTime: string | null; endTime: string | null; place: string; scope: EventScope; creatorId: string; createdAt: string };
export type EventInput = { title: string; kind: EventKind; date: string; startTime: string | null; endTime: string | null; place: string; scope: EventScope };
export type EventErrors = Partial<Record<"title" | "date" | "startTime" | "endTime" | "place", string>>;
const isISODate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && toISO(parse(s)) === s;

export function validateEventInput(i: EventInput): { ok: true; value: EventInput } | { ok: false; errors: EventErrors } {
  const errors: EventErrors = {}; const title = i.title.trim(); const place = i.place.trim();
  if (!title) errors.title = "Le titre est obligatoire."; else if (title.length > EVENT_LIMITS.title) errors.title = `${EVENT_LIMITS.title} caractères maximum.`;
  if (!isISODate(i.date)) errors.date = "Choisissez une date.";
  if (i.startTime && !isTime(i.startTime)) errors.startTime = "Heure invalide.";
  if (i.endTime && !isTime(i.endTime)) errors.endTime = "Heure invalide.";
  else if (i.endTime && !i.startTime) errors.endTime = "Indiquez d'abord l'heure de début.";
  else if (i.endTime && i.startTime && i.endTime <= i.startTime) errors.endTime = "La fin doit suivre le début.";
  if (place.length > EVENT_LIMITS.place) errors.place = `${EVENT_LIMITS.place} caractères maximum.`;
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: { ...i, title, place, startTime: i.startTime || null, endTime: i.startTime ? i.endTime || null : null } };
}
export const createEvent = (i: EventInput, creatorId: string, now: string, id: string): { ok: true; value: AgendaEvent } | { ok: false; reason: string } => {
  const v = validateEventInput(i); if (!v.ok) return { ok: false, reason: Object.values(v.errors)[0] ?? "Événement invalide." };
  return { ok: true, value: { id, ...v.value, creatorId, createdAt: now } };
};
/** Un événement personnel n'est visible que de son créateur ; un événement d'équipe de tous. */
export const canSeeEvent = (e: AgendaEvent, me: string) => e.scope === "team" || e.creatorId === me;
/** Seul le créateur modifie ou supprime son événement. Les coordinateurs peuvent aussi supprimer un événement d'équipe. */
export const canManageEvent = (e: AgendaEvent, me: string, coordinator: boolean) => e.creatorId === me || (coordinator && e.scope === "team");

/* ---------- Construction de l'agenda ---------- */
export type AgendaView = "mine" | "team";
/** Entrée de l'agenda COLLECTIF (fonction `list_team_agenda`) : le strict nécessaire, JAMAIS de description, commentaire ni historique. */
export type SharedEntry = { id: string; title: string; assigneeId: string; dueDate: string; dueTime: string | null; status: Mission["status"]; priority: Mission["priority"] };
export type AgendaItem =
  | { type: "mission"; key: string; date: string; time: string | null; mission: Mission }
  | { type: "shared"; key: string; date: string; time: string | null; entry: SharedEntry }
  | { type: "event"; key: string; date: string; time: string | null; event: AgendaEvent };
export type Agenda = {
  byDay: Record<string, AgendaItem[]>;
  /** Missions sans date, non terminées. */
  unscheduled: Mission[];
  /** Missions en retard (échéance passée, non terminées) — aussi présentes à leur date. */
  overdue: Mission[];
  /** Propositions d'attribution en attente (à décider par les coordinateurs). */
  proposals: Mission[];
};

const PRIO = { urgent: 0, high: 1, normal: 2 } as const;
const cmpItem = (a: AgendaItem, b: AgendaItem) => {
  // Éléments horaires d'abord (par heure), puis « toute la journée » ; à égalité : événements avant missions, priorité, titre.
  if ((a.time === null) !== (b.time === null)) return a.time === null ? 1 : -1;
  if (a.time !== b.time) return (a.time ?? "") < (b.time ?? "") ? -1 : 1;
  if ((a.type === "event") !== (b.type === "event")) return a.type === "event" ? -1 : 1;
  const pa = a.type === "mission" ? a.mission : a.type === "shared" ? a.entry : null; const pb = b.type === "mission" ? b.mission : b.type === "shared" ? b.entry : null;
  if (pa && pb) return PRIO[pa.priority] - PRIO[pb.priority] || pa.title.localeCompare(pb.title, "fr");
  return 0;
};

/**
 * « Mon agenda » : mes missions (responsable) + événements d'équipe + mes événements personnels.
 * « Équipe » : toutes les missions que l'utilisateur est autorisé à voir (la base applique ses droits) + événements d'équipe + les miens.
 * `missions` doit déjà être filtré par les droits de lecture (base) : l'agenda n'élargit JAMAIS la visibilité.
 */
export function buildAgenda(input: { missions: Mission[]; events: AgendaEvent[]; me: string; coordinator: boolean; view: AgendaView; today: string; /** Planning collectif (vue Équipe seulement) : entrées minimales d'autres missions. */ shared?: SharedEntry[] }): Agenda {
  const { me, view, today } = input;
  const live = input.missions.filter((m) => !m.archivedAt);
  const scoped = view === "mine" ? live.filter((m) => m.assigneeId === me) : live;
  const byDay: Record<string, AgendaItem[]> = {};
  const push = (it: AgendaItem) => { (byDay[it.date] ??= []).push(it); };
  for (const m of scoped) if (m.dueDate) push({ type: "mission", key: `m:${m.id}`, date: m.dueDate, time: m.dueTime ?? null, mission: m });
  // Agenda collectif : seulement en vue Équipe, jamais en double d'une mission déjà lisible, jamais archivée (la base les exclut aussi).
  if (view === "team") { const known = new Set(input.missions.map((m) => m.id)); for (const e of input.shared ?? []) if (!known.has(e.id)) push({ type: "shared", key: `s:${e.id}`, date: e.dueDate, time: e.dueTime, entry: e }); }
  for (const e of input.events) if (canSeeEvent(e, me)) push({ type: "event", key: `e:${e.id}`, date: e.date, time: e.startTime, event: e });
  for (const d of Object.keys(byDay)) byDay[d].sort(cmpItem);
  return {
    byDay,
    unscheduled: scoped.filter((m) => !m.dueDate && m.status !== "done").sort((a, b) => PRIO[a.priority] - PRIO[b.priority] || b.updatedAt.localeCompare(a.updatedAt)),
    overdue: scoped.filter((m) => m.dueDate && m.dueDate < today && m.status !== "done").sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? "")),
    proposals: input.coordinator ? live.filter((m) => m.proposedAssigneeId) : [],
  };
}
export const dayCount = (a: Agenda, day: string) => (a.byDay[day] ?? []).length;
export const hasAnything = (a: Agenda) => Object.keys(a.byDay).length > 0 || a.unscheduled.length > 0 || a.overdue.length > 0;

export const fmtTime = (t: string | null) => (t ? t.replace(":", "h") : "");
