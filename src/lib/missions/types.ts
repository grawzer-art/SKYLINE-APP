import type { Actor, Mission, MissionInfoInput, MissionInput, MissionStatus } from "../../domain/missions.ts";
import type { DbErrorKind, MissionError } from "./errors.ts";
import type { MissionComment, Result } from "./service.ts";

/** Résultat d'une action de l'interface (une action = un résultat, un message, un état de chargement). */
export type ActionResult = { ok: true; mission: Mission | null } | { ok: false; kind: DbErrorKind | "local"; message: string };
export type Person = { id: string; name: string };
/** Annuaire utilisé par l'écran : équipe locale de démonstration OU équipe réelle (list_team, UUID). */
export type Directory = { members: Person[]; validatorIds: string[]; name: (id: string) => string };
/** `misconfigured` : configuration demandée mais incorrecte (ex. STAFF_DATA_SOURCE=db sans authentification Supabase) : aucune donnée, jamais de repli local. */
export type LoadStatus = "loading" | "ready" | "error" | "forbidden" | "misconfigured";

export type MissionsApi = {
  /** `local` : données de démonstration sur l'appareil. `db` : base Supabase (partagée, droits vérifiés par la base). */
  source: "local" | "db";
  status: LoadStatus; error: MissionError | null; refreshing: boolean;
  missions: Mission[]; directory: Directory;
  refresh: () => Promise<void>;
  create: (input: MissionInput, a: Actor) => Promise<ActionResult>;
  editInfo: (id: string, info: MissionInfoInput, a: Actor) => Promise<ActionResult>;
  assign: (id: string, assigneeId: string, a: Actor) => Promise<ActionResult>;
  resolve: (id: string, approve: boolean, a: Actor, note?: string) => Promise<ActionResult>;
  setStatus: (id: string, to: MissionStatus, a: Actor, note?: string) => Promise<ActionResult>;
  archive: (id: string, a: Actor) => Promise<ActionResult>;
  remove: (id: string, a: Actor) => Promise<ActionResult>;
  /** Commentaires : mode base de données uniquement. */
  comments: { supported: boolean; load: (id: string) => Promise<Result<MissionComment[]>>; recent: () => Promise<Result<MissionComment[]>>; add: (id: string, body: string) => Promise<Result<MissionComment>> };
  /** Ce que la source de données sait enregistrer. `dueTime` : heure facultative d'une mission (mode local ; base = migration B3 proposée, non appliquée). */
  capabilities: { dueTime: boolean; events: boolean };
  /** Outils de démonstration (mode local uniquement). */
  local: { clearAll: () => void; addMany: (list: Mission[]) => void } | null;
};
