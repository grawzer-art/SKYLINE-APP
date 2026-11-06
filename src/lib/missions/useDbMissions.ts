"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Mission } from "../../domain/missions.ts";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { createSupabasePort } from "./supabase-port.ts";
import { createMissionsService, type Result, type TeamMember } from "./service.ts";
import type { MissionError } from "./errors.ts";
import type { ActionResult, MissionsApi, LoadStatus } from "./types.ts";

/**
 * MODE BASE DE DONNÉES : lecture par la RLS, écriture par les fonctions SQL autorisées (via `service.ts`).
 * AUCUN stockage navigateur de données de mission ici. Les droits sont décidés par la base ; l'interface n'en est que le reflet.
 * Pas de mise à jour optimiste : l'état affiché est celui renvoyé par la base. Rechargement au retour sur l'onglet (au plus toutes les 15 s).
 */
const RELOAD_MIN_MS = 15_000;
type State = { status: LoadStatus; error: MissionError | null; missions: Mission[]; team: TeamMember[] };
const INITIAL: State = { status: "loading", error: null, missions: [], team: [] };
const toAction = (r: Result<Mission | null>): ActionResult => (r.ok ? { ok: true, mission: r.value } : { ok: false, kind: r.error.kind, message: r.error.message });

export function useDbMissions(enabled: boolean): MissionsApi {
  const [state, setState] = useState<State>(INITIAL);
  const [refreshing, setRefreshing] = useState(false);
  const service = useMemo(() => (enabled ? createMissionsService(createSupabasePort(createBrowserSupabase())) : null), [enabled]);
  const seq = useRef(0); const last = useRef(0);

  /** Applique le résultat d'une lecture, sauf si une lecture plus récente a pris le relais. */
  const apply = useCallback((mine: number, r: Awaited<ReturnType<NonNullable<typeof service>["loadAll"]>>) => {
    if (mine !== seq.current) return;
    last.current = Date.now(); setRefreshing(false);
    if (r.ok) setState({ status: "ready", error: null, missions: r.value.missions, team: r.value.team });
    else if (r.error.kind === "forbidden") setState({ status: "forbidden", error: r.error, missions: [], team: [] });
    else setState((p) => (p.status === "ready" ? { ...p, error: r.error } : { status: "error", error: r.error, missions: [], team: [] }));
  }, []);
  const load = useCallback(async () => { if (!service) return; const mine = ++seq.current; setRefreshing(true); apply(mine, await service.loadAll()); }, [service, apply]);

  useEffect(() => { if (!service) return; const mine = ++seq.current; void service.loadAll().then((r) => apply(mine, r)); }, [service, apply]);
  useEffect(() => {
    if (!service) return;
    const on = () => { if (document.visibilityState === "visible" && Date.now() - last.current > RELOAD_MIN_MS) void load(); };
    document.addEventListener("visibilitychange", on); return () => document.removeEventListener("visibilitychange", on);
  }, [service, load]);

  /** Fusionne la mission renvoyée par la base dans la liste ; sur conflit / introuvable, recharge en arrière-plan. */
  const merge = useCallback((r: Result<Mission>): ActionResult => {
    if (r.ok) { const m = r.value; setState((p) => ({ ...p, missions: p.missions.some((x) => x.id === m.id) ? p.missions.map((x) => (x.id === m.id ? m : x)) : [...p.missions, m] })); }
    else if (r.error.kind === "conflict" || r.error.kind === "not_found") void load();
    return toAction(r);
  }, [load]);

  const directory = useMemo(() => {
    const byId = new Map(state.team.map((x) => [x.id, x.name]));
    return { members: state.team.map((x) => ({ id: x.id, name: x.name })), validatorIds: state.team.filter((x) => x.coordinator).map((x) => x.id), name: (id: string) => byId.get(id) ?? "Ancien membre" };
  }, [state.team]);

  const none = (): Promise<ActionResult> => Promise.resolve({ ok: false, kind: "invalid", message: "Base de données indisponible." });
  return {
    source: "db", status: enabled ? state.status : "loading", error: state.error, refreshing, missions: state.missions, directory,
    refresh: () => load(),
    create: (input) => (service ? service.createMission(input).then(merge) : none()),
    editInfo: (id, info) => { const m = state.missions.find((x) => x.id === id); return service && m ? service.editInfo(m, info).then(merge) : none(); },
    assign: (id, assigneeId) => (service ? service.assign(id, assigneeId).then(merge) : none()),
    resolve: (id, approve, _a, note) => (service ? service.resolve(id, approve, note).then(merge) : none()),
    setStatus: (id, to, _a, note) => (service ? service.setStatus(id, to, note).then(merge) : none()),
    archive: (id) => (service ? service.archive(id).then(merge) : none()),
    remove: async (id) => {
      if (!service) return none();
      const r = await service.remove(id);
      if (r.ok) setState((p) => ({ ...p, missions: p.missions.filter((x) => x.id !== id) })); else if (r.error.kind === "not_found") void load();
      return toAction(r);
    },
    comments: {
      supported: true,
      recent: () => (service ? service.loadRecentComments() : Promise.resolve({ ok: false, error: { kind: "invalid", message: "Base de données indisponible." } })),
      load: (id) => (service ? service.loadComments(id) : Promise.resolve({ ok: false, error: { kind: "invalid", message: "Base de données indisponible." } })),
      add: (id, body) => (service ? service.addComment(id, body) : Promise.resolve({ ok: false, error: { kind: "invalid", message: "Base de données indisponible." } })),
    },
    // Heure et événements : pas de colonne / table en base tant que la migration B3 (proposée) n'est pas validée et appliquée.
    capabilities: { dueTime: false, events: false },
    local: null,
  };
}
