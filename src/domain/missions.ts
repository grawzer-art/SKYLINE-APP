/**
 * MISSIONS — règles métier pures (aucune dépendance React / stockage), prévues pour être réutilisées côté SERVEUR.
 * Toute règle d'autorisation ci-dessous devra être RÉ-APPLIQUÉE par le serveur lors de la future synchronisation multi-utilisateur :
 * le navigateur n'est jamais la source de vérité des droits.
 */
export const MISSION_STATUSES = ["todo", "in_progress", "review", "done"] as const;
export type MissionStatus = (typeof MISSION_STATUSES)[number];
export const MISSION_PRIORITIES = ["normal", "high", "urgent"] as const;
export type MissionPriority = (typeof MISSION_PRIORITIES)[number];
export const STATUS_LABEL: Record<MissionStatus, string> = { todo: "À faire", in_progress: "En cours", review: "En validation", done: "Terminée" };
export const PRIORITY_LABEL: Record<MissionPriority, string> = { normal: "Normale", high: "Haute", urgent: "Urgente" };

export const LIMITS = { title: 120, description: 500, note: 200 } as const;

export type HistoryKind = "created" | "edited" | "status" | "validated" | "returned";
export type HistoryEntry = { id: string; at: string; by: string; kind: HistoryKind; from?: MissionStatus; to?: MissionStatus; note?: string };
export type Mission = {
  id: string; title: string; description: string;
  assigneeId: string; creatorId: string;
  /** Personne désignée pour valider (jamais l'assigné). */
  validatorId: string;
  /** Échéance au format AAAA-MM-JJ, ou null. */
  dueDate: string | null;
  priority: MissionPriority; status: MissionStatus;
  createdAt: string; updatedAt: string; history: HistoryEntry[];
};

/** Qui agit : un membre de l'équipe et son pouvoir de coordination (rôle serveur « admin » dans la démo). */
export type Actor = { memberId: string; coordinator: boolean };
export type MissionInput = { title: string; description: string; assigneeId: string; validatorId: string; dueDate: string | null; priority: MissionPriority; status: MissionStatus };

/* ---------- Validation ---------- */
export type MissionErrors = Partial<Record<"title" | "description" | "assigneeId" | "validatorId" | "dueDate" | "priority" | "status", string>>;
const isISODate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;

export function validateMissionInput(i: MissionInput, memberIds: readonly string[]): { ok: true; value: MissionInput } | { ok: false; errors: MissionErrors } {
  const errors: MissionErrors = {};
  const title = i.title.trim(); const description = i.description.trim();
  if (!title) errors.title = "Le titre est obligatoire.";
  else if (title.length > LIMITS.title) errors.title = `${LIMITS.title} caractères maximum.`;
  if (description.length > LIMITS.description) errors.description = `${LIMITS.description} caractères maximum.`;
  if (!memberIds.includes(i.assigneeId)) errors.assigneeId = "Choisissez un responsable.";
  if (!memberIds.includes(i.validatorId)) errors.validatorId = "Choisissez qui valide.";
  else if (i.validatorId === i.assigneeId) errors.validatorId = "La validation doit être faite par une autre personne.";
  if (i.dueDate !== null && !isISODate(i.dueDate)) errors.dueDate = "Date invalide.";
  if (!MISSION_PRIORITIES.includes(i.priority)) errors.priority = "Priorité invalide.";
  if (!MISSION_STATUSES.includes(i.status)) errors.status = "Statut invalide.";
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: { ...i, title, description, dueDate: i.dueDate || null } };
}

/* ---------- Retards ---------- */
export const isOverdue = (m: Pick<Mission, "dueDate" | "status">, today: string | null) => !!today && !!m.dueDate && m.status !== "done" && m.dueDate < today;
export function daysLate(m: Pick<Mission, "dueDate">, today: string) {
  if (!m.dueDate) return 0;
  return Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${m.dueDate}T00:00:00Z`)) / 86_400_000);
}

/* ---------- Autorisations ---------- */
export const canViewAll = (a: Actor) => a.coordinator;
export const canView = (a: Actor, m: Mission) => a.coordinator || m.assigneeId === a.memberId || m.creatorId === a.memberId || m.validatorId === a.memberId;
export const isMine = (a: Actor, m: Mission) => m.assigneeId === a.memberId;
/** Tout membre peut créer ; seul un coordinateur peut confier une mission à quelqu'un d'autre. */
export const canCreateFor = (a: Actor, assigneeId: string) => a.coordinator || assigneeId === a.memberId;
export const canEdit = (a: Actor, m: Mission) => a.coordinator || m.creatorId === a.memberId;
export const canDelete = (a: Actor, m: Mission) => a.coordinator || m.creatorId === a.memberId;

/** Statuts que `actor` peut donner à la mission. « Terminée » n'est JAMAIS accessible à l'assigné : seule la validation (ou un coordinateur) clôt. */
export function allowedStatusTransitions(a: Actor, m: Mission): MissionStatus[] {
  if (a.coordinator) return MISSION_STATUSES.filter((s) => s !== m.status);
  const out = new Set<MissionStatus>();
  if (m.validatorId === a.memberId && m.status === "review") { out.add("done"); out.add("in_progress"); }
  if (m.assigneeId === a.memberId) {
    if (m.status === "todo") out.add("in_progress");
    if (m.status === "in_progress") { out.add("todo"); out.add("review"); }
    if (m.status === "review") out.add("in_progress"); // retirer sa soumission
  }
  return [...out];
}

/* ---------- Opérations (retournent une nouvelle mission, ne modifient rien) ---------- */
type Res<T> = { ok: true; value: T } | { ok: false; reason: string };
const entry = (id: string, at: string, by: string, kind: HistoryKind, extra: Partial<HistoryEntry> = {}): HistoryEntry => ({ id, at, by, kind, ...extra });

export function createMission(i: MissionInput, a: Actor, memberIds: readonly string[], now: string, id: string): Res<Mission> {
  const v = validateMissionInput(i, memberIds); if (!v.ok) return { ok: false, reason: Object.values(v.errors)[0] ?? "Mission invalide." };
  if (!canCreateFor(a, v.value.assigneeId)) return { ok: false, reason: "Vous ne pouvez créer une mission que pour vous-même." };
  if (!a.coordinator && v.value.status === "done") return { ok: false, reason: "Une mission ne peut pas être créée directement terminée." };
  return { ok: true, value: { id, ...v.value, creatorId: a.memberId, createdAt: now, updatedAt: now, history: [entry(`${id}-h0`, now, a.memberId, "created")] } };
}

export function changeStatus(m: Mission, to: MissionStatus, a: Actor, now: string, note?: string): Res<Mission> {
  if (!allowedStatusTransitions(a, m).includes(to)) return { ok: false, reason: "Ce changement de statut n'est pas autorisé pour vous." };
  const n = note?.trim().slice(0, LIMITS.note) || undefined;
  const kind: HistoryKind = m.status === "review" && to === "done" ? "validated" : m.status === "review" && to === "in_progress" && m.validatorId === a.memberId ? "returned" : "status";
  return { ok: true, value: { ...m, status: to, updatedAt: now, history: [...m.history, entry(`${m.id}-h${m.history.length}`, now, a.memberId, kind, { from: m.status, to, note: n })] } };
}

export function updateMission(m: Mission, i: MissionInput, a: Actor, memberIds: readonly string[], now: string): Res<Mission> {
  if (!canEdit(a, m)) return { ok: false, reason: "Vous ne pouvez pas modifier cette mission." };
  const v = validateMissionInput(i, memberIds); if (!v.ok) return { ok: false, reason: Object.values(v.errors)[0] ?? "Mission invalide." };
  if (!canCreateFor(a, v.value.assigneeId)) return { ok: false, reason: "Vous ne pouvez confier une mission qu'à vous-même." };
  const changed = (["title", "description", "assigneeId", "validatorId", "dueDate", "priority"] as const).filter((k) => m[k] !== v.value[k]);
  let next: Mission = { ...m, ...v.value, status: m.status };
  if (changed.length) next = { ...next, updatedAt: now, history: [...next.history, entry(`${m.id}-h${next.history.length}`, now, a.memberId, "edited", { note: changed.join(", ") })] };
  if (v.value.status !== m.status) { const s = changeStatus(next, v.value.status, a, now); if (!s.ok) return s; next = s.value; }
  return { ok: true, value: next };
}

/* ---------- Affichage ---------- */
export type MissionFilters = { assigneeId?: string; status?: MissionStatus; priority?: MissionPriority };
export const filterMissions = (list: Mission[], f: MissionFilters) => list.filter((m) => (!f.assigneeId || m.assigneeId === f.assigneeId) && (!f.status || m.status === f.status) && (!f.priority || m.priority === f.priority));
export const countByStatus = (list: Mission[]) => ({ todo: list.filter((m) => m.status === "todo").length, in_progress: list.filter((m) => m.status === "in_progress").length, review: list.filter((m) => m.status === "review").length, done: list.filter((m) => m.status === "done").length });
const PRIO = { urgent: 0, high: 1, normal: 2 } as const;
/** Terminées en dernier ; puis retards, priorité, échéance la plus proche, plus récent. */
export function sortMissions(list: Mission[], today: string | null): Mission[] {
  const rank = (m: Mission) => (m.status === "done" ? 3 : isOverdue(m, today) ? 0 : 1);
  return [...list].sort((a, b) => rank(a) - rank(b) || PRIO[a.priority] - PRIO[b.priority] || (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || b.updatedAt.localeCompare(a.updatedAt));
}
