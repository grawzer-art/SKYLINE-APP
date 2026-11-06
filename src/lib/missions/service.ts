import type { HistoryEntry, HistoryKind, Mission, MissionInfoInput, MissionInput, MissionPriority, MissionStatus } from "../../domain/missions.ts";
import { mapDbError, type MissionError } from "./errors.ts";
import type { DbPort, Row } from "./port.ts";

/**
 * Service MISSIONS en mode base de données. Même forme de résultat pour chaque action : { ok, value | error }.
 *  - Les droits sont décidés PAR LA BASE (RLS + fonctions SECURITY DEFINER). Ce service ne contient aucune règle d'autorisation :
 *    il transmet, convertit et traduit les erreurs.
 *  - Garde d'identifiants : tout identifiant doit être un UUID. Un identifiant local fictif (« tom », « m-123 »…) n'atteint
 *    JAMAIS la base : l'action est refusée avant l'appel.
 *  - Une action = un appel de fonction (aucune opération composite silencieuse).
 */
export type TeamMember = { id: string; slug: string; name: string; functionTitle: string; coordinator: boolean };
export type MissionComment = { id: string; missionId: string; authorId: string; body: string; createdAt: string };
export type Snapshot = { missions: Mission[]; team: TeamMember[] };
/** Entrée de l'agenda COLLECTIF : uniquement titre, responsable, date, heure, statut, priorité (jamais de description, commentaire ni historique). */
export type TeamAgendaEntry = { id: string; title: string; assigneeId: string; dueDate: string; dueTime: string | null; status: MissionStatus; priority: MissionPriority };
export type DbSchema = "b2" | "b3";
export type Result<T> = { ok: true; value: T } | { ok: false; error: MissionError };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: unknown): s is string => typeof s === "string" && UUID.test(s);
const bad = (message = "Identifiant invalide : action refusée."): Result<never> => ({ ok: false, error: { kind: "invalid", message } });
const fail = (e: Parameters<typeof mapDbError>[0]): Result<never> => ({ ok: false, error: mapDbError(e) });

const str = (v: unknown) => (typeof v === "string" ? v : "");
const strOrNull = (v: unknown) => (typeof v === "string" && v ? v : null);
const toArr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : typeof v === "string" ? v.replace(/^\{|\}$/g, "").split(",").map((x) => x.trim()).filter(Boolean) : []);
const MISSION_COLS = "id,title,description,creator_id,assignee_id,proposed_assignee_id,validator_id,project_id,priority,status,due_date,archived_at,version,created_at,updated_at";
/** Schéma B3 (migration appliquée) : colonne `due_time` en plus. Le schéma B2 ne la contient pas : ne JAMAIS la demander tant que la migration n'est pas appliquée. */
const MISSION_COLS_B3 = `${MISSION_COLS},due_time`;
const EVENT_COLS = "id,mission_id,at,actor_id,kind,from_status,to_status,note";
const COMMENT_COLS = "id,mission_id,author_id,body,created_at";

const toEvent = (r: Row): HistoryEntry => ({ id: String(r.id), at: str(r.at), by: str(r.actor_id), kind: str(r.kind) as HistoryKind, ...(r.from_status ? { from: r.from_status as MissionStatus } : {}), ...(r.to_status ? { to: r.to_status as MissionStatus } : {}), ...(r.note ? { note: str(r.note) } : {}) });
const toMission = (r: Row, history: HistoryEntry[]): Mission => ({
  id: str(r.id), title: str(r.title), description: str(r.description), assigneeId: str(r.assignee_id), creatorId: str(r.creator_id),
  proposedAssigneeId: strOrNull(r.proposed_assignee_id), validatorId: str(r.validator_id), dueDate: strOrNull(r.due_date),
  priority: r.priority as MissionPriority, status: r.status as MissionStatus, archivedAt: strOrNull(r.archived_at),
  createdAt: str(r.created_at), updatedAt: str(r.updated_at), history, version: Number(r.version ?? 1), projectId: strOrNull(r.project_id), dueTime: toHHMM(r.due_time),
});
const toHHMM = (v: unknown) => (typeof v === "string" && /^\d{2}:\d{2}/.test(v) ? v.slice(0, 5) : null);
const toEntry = (r: Row): TeamAgendaEntry => ({ id: str(r.id), title: str(r.title), assigneeId: str(r.assignee_id), dueDate: str(r.due_date).slice(0, 10), dueTime: toHHMM(r.due_time), status: r.status as MissionStatus, priority: r.priority as MissionPriority });
const toTeam = (r: Row): TeamMember => ({ id: str(r.id), slug: str(r.slug), name: str(r.display_name), functionTitle: str(r.function_title),
  coordinator: toArr(r.platform_roles).includes("super_admin") || toArr(r.staff_roles).includes("admin") });
const toComment = (c: Row): MissionComment => ({ id: str(c.id), missionId: str(c.mission_id), authorId: str(c.author_id), body: str(c.body), createdAt: str(c.created_at) });

export function createMissionsService(port: DbPort, opts: { schema?: DbSchema } = {}) {
  const b3 = opts.schema === "b3"; const COLS = b3 ? MISSION_COLS_B3 : MISSION_COLS;
  const events = (one?: string) => port.select("mission_events", { columns: EVENT_COLS, eq: one ? { mission_id: one } : undefined, order: [["at", true], ["id", true]], limit: 5000 });

  /** Chargement initial / rechargement : missions visibles (RLS) + historique + annuaire (fonction list_team). Annuaire vide ⇒ aucun accès STAFF. */
  async function loadAll(): Promise<Result<Snapshot>> {
    const [m, ev, t] = await Promise.all([
      port.select("missions", { columns: COLS, order: [["created_at", true]], limit: 1000 }),
      events(),
      port.rpc("list_team"),
    ]);
    if (m.error) return fail(m.error); if (ev.error) return fail(ev.error); if (t.error) return fail(t.error);
    const team = ((t.data as Row[] | null) ?? []).map(toTeam).filter((x) => isUuid(x.id));
    if (team.length === 0) return { ok: false, error: { kind: "forbidden", message: "Ce compte n'a pas accès aux données de STAFF HQ." } };
    const byMission = new Map<string, HistoryEntry[]>();
    for (const e of ev.data ?? []) { const k = str(e.mission_id); byMission.set(k, [...(byMission.get(k) ?? []), toEvent(e)]); }
    return { ok: true, value: { missions: (m.data ?? []).map((r) => toMission(r, byMission.get(str(r.id)) ?? [])), team } };
  }

  async function fetchMission(id: string): Promise<Result<Mission>> {
    if (!isUuid(id)) return bad();
    const [m, ev] = await Promise.all([port.select("missions", { columns: COLS, eq: { id }, limit: 1 }), events(id)]);
    if (m.error) return fail(m.error); if (ev.error) return fail(ev.error);
    const row = m.data?.[0]; if (!row) return fail({ message: "not_found" });
    return { ok: true, value: toMission(row, (ev.data ?? []).map(toEvent)) };
  }

  /** Une écriture = un appel de fonction, puis relecture de la mission (état réel de la base). */
  async function write(fn: string, args: Record<string, unknown>, id: string | null): Promise<Result<Mission>> {
    const r = await port.rpc(fn, args); if (r.error) return fail(r.error);
    return fetchMission(id ?? str((r.data as Row | null)?.id));
  }

  return {
    loadAll, fetchMission,

    createMission(i: MissionInput): Promise<Result<Mission>> {
      if (!isUuid(i.assigneeId) || !isUuid(i.validatorId)) return Promise.resolve(bad());
      // Schéma B3 : fonction `_v2` (heure explicite, null = aucune). Schéma B2 : fonction B0 inchangée (l'heure n'existe pas).
      if (b3) return write("create_mission_v2", { p_title: i.title, p_description: i.description, p_assignee: i.assigneeId, p_validator: i.validatorId, p_due: i.dueDate, p_time: i.dueDate ? i.dueTime ?? null : null, p_priority: i.priority, p_status: i.status, p_project: null }, null);
      return write("create_mission", { p_title: i.title, p_description: i.description, p_assignee: i.assigneeId, p_validator: i.validatorId, p_due: i.dueDate, p_priority: i.priority, p_status: i.status, p_project: null }, null);
    },
    /** Informations SEULEMENT (titre, description, validateur, échéance, priorité), avec contrôle de version. */
    editInfo(m: Mission, i: MissionInfoInput): Promise<Result<Mission>> {
      if (!isUuid(m.id) || !isUuid(i.validatorId) || !Number.isInteger(m.version)) return Promise.resolve(bad());
      if (b3) return write("update_mission_v2", { p_id: m.id, p_expected_version: m.version, p_title: i.title, p_description: i.description, p_validator: i.validatorId, p_due: i.dueDate, p_time: i.dueDate ? i.dueTime ?? null : null, p_priority: i.priority, p_project: m.projectId ?? null }, m.id);
      return write("update_mission", { p_id: m.id, p_expected_version: m.version, p_title: i.title, p_description: i.description, p_validator: i.validatorId, p_due: i.dueDate, p_priority: i.priority, p_project: m.projectId ?? null }, m.id);
    },
    /** Attribution (coordinateur : immédiate) ou proposition (créateur / responsable) : la base tranche. */
    assign(id: string, assigneeId: string): Promise<Result<Mission>> {
      if (!isUuid(id) || !isUuid(assigneeId)) return Promise.resolve(bad());
      return write("assign_mission", { p_id: id, p_assignee: assigneeId }, id);
    },
    resolve(id: string, approve: boolean, note?: string): Promise<Result<Mission>> {
      if (!isUuid(id)) return Promise.resolve(bad());
      return write("resolve_assignment", { p_id: id, p_approve: approve, p_note: note?.trim() || null }, id);
    },
    setStatus(id: string, to: MissionStatus, note?: string): Promise<Result<Mission>> {
      if (!isUuid(id)) return Promise.resolve(bad());
      return write("set_mission_status", { p_id: id, p_to: to, p_note: note?.trim() || null }, id);
    },
    archive(id: string): Promise<Result<Mission>> {
      if (!isUuid(id)) return Promise.resolve(bad());
      return write("archive_mission", { p_id: id }, id);
    },
    async remove(id: string): Promise<Result<null>> {
      if (!isUuid(id)) return bad();
      const r = await port.rpc("delete_mission", { p_id: id }); return r.error ? fail(r.error) : { ok: true, value: null };
    },
    async loadComments(id: string): Promise<Result<MissionComment[]>> {
      if (!isUuid(id)) return bad();
      const r = await port.select("mission_comments", { columns: COMMENT_COLS, eq: { mission_id: id }, order: [["created_at", true]], limit: 500 });
      if (r.error) return fail(r.error);
      return { ok: true, value: (r.data ?? []).map(toComment) };
    },
    /** Agenda COLLECTIF (schéma B3 seulement) : planning de l'équipe, colonnes minimales, fenêtre de 62 jours maximum (la base borne et filtre). */
    async loadTeamAgenda(from: string, to: string): Promise<Result<TeamAgendaEntry[]>> {
      if (!b3) return { ok: false, error: { kind: "invalid", message: "Agenda collectif indisponible avec ce schéma de base de données." } };
      if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return bad("Période invalide.");
      const r = await port.rpc("list_team_agenda", { p_from: from, p_to: to }); if (r.error) return fail(r.error);
      return { ok: true, value: ((r.data as Row[] | null) ?? []).map(toEntry).filter((e) => isUuid(e.id)) };
    },
    /** Commentaires récents visibles par l'utilisateur (RLS) : alimente la boîte de notifications, en UNE requête. */
    async loadRecentComments(limit = 60): Promise<Result<MissionComment[]>> {
      const r = await port.select("mission_comments", { columns: COMMENT_COLS, order: [["created_at", false]], limit });
      return r.error ? fail(r.error) : { ok: true, value: (r.data ?? []).map(toComment) };
    },
    async addComment(id: string, body: string): Promise<Result<MissionComment>> {
      if (!isUuid(id)) return bad();
      const r = await port.rpc("add_mission_comment", { p_id: id, p_body: body }); if (r.error) return fail(r.error);
      return { ok: true, value: toComment((r.data ?? {}) as Row) };
    },
  };
}
export type MissionsService = ReturnType<typeof createMissionsService>;
