"use client";
import { useCallback, useMemo } from "react";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { activeMembers, getStaffMember, validatorIds } from "@/data/staff";
import { archiveMission, assignMission, canDelete, changeStatus as changeStatusRule, createMission, editMissionInfo, normalizeMission, resolveAssignment, type Mission } from "@/domain/missions";
import type { ActionResult, MissionsApi } from "./types";

/**
 * MODE LOCAL (démonstration) : persistance dans le navigateur de CET appareil. Aucune synchronisation, aucun appel à la base.
 * `storageKey` vaut `…:inactive` quand la source de données est la base : ce crochet reste alors inerte (aucune écriture).
 */
export const MISSIONS_KEY = "skyline.staff.missions.v1";
const EMPTY: Mission[] = [];
const nowISO = () => new Date().toISOString();
const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `m-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`);
const noMission: ActionResult = { ok: false, kind: "local", message: "Mission introuvable." };

export function useLocalMissions(storageKey: string, active: boolean): MissionsApi {
  const [stored, set, latestStored] = useLocalStorage<Mission[]>(storageKey, EMPTY);
  const missions = useMemo(() => stored.map(normalizeMission), [stored]);
  const latest = useCallback(() => latestStored().map(normalizeMission), [latestStored]);
  const ids = useMemo(() => activeMembers().map((m) => m.id), []);
  const vids = useMemo(() => validatorIds(), []);
  const directory = useMemo(() => ({ members: activeMembers().map((m) => ({ id: m.id, name: m.name })), validatorIds: vids, name: (id: string) => getStaffMember(id)?.name ?? "—" }), [vids]);

  const apply = useCallback((id: string, f: (m: Mission) => { ok: true; value: Mission } | { ok: false; reason: string }): Promise<ActionResult> => {
    if (!active) return Promise.resolve({ ok: false, kind: "local", message: "Mode local inactif." });
    const m = latest().find((x) => x.id === id); if (!m) return Promise.resolve(noMission);
    const r = f(m); if (!r.ok) return Promise.resolve({ ok: false, kind: "local", message: r.reason });
    set(latest().map((x) => (x.id === id ? r.value : x))); return Promise.resolve({ ok: true, mission: r.value });
  }, [active, latest, set]);

  return {
    source: "local", status: "ready", error: null, refreshing: false, missions, directory,
    refresh: async () => {},
    create: async (input, a) => {
      if (!active) return { ok: false, kind: "local", message: "Mode local inactif." };
      const r = createMission(input, a, ids, nowISO(), newId(), vids); if (!r.ok) return { ok: false, kind: "local", message: r.reason };
      set([...latest(), r.value]); return { ok: true, mission: r.value };
    },
    editInfo: (id, info, a) => apply(id, (m) => editMissionInfo(m, info, a, ids, nowISO(), vids)),
    assign: (id, assigneeId, a) => apply(id, (m) => assignMission(m, assigneeId, a, ids, nowISO())),
    resolve: (id, approve, a, note) => apply(id, (m) => resolveAssignment(m, approve, a, nowISO(), note)),
    setStatus: (id, to, a, note) => apply(id, (m) => changeStatusRule(m, to, a, nowISO(), note)),
    archive: (id, a) => apply(id, (m) => archiveMission(m, a, nowISO())),
    remove: async (id, a) => {
      if (!active) return { ok: false, kind: "local", message: "Mode local inactif." };
      const m = latest().find((x) => x.id === id); if (!m) return noMission;
      if (!canDelete(a, m)) return { ok: false, kind: "local", message: "Vous ne pouvez pas supprimer cette mission." };
      set(latest().filter((x) => x.id !== id)); return { ok: true, mission: null };
    },
    comments: { supported: false, load: async () => ({ ok: true, value: [] }), recent: async () => ({ ok: true, value: [] }), add: async () => ({ ok: false, error: { kind: "invalid", message: "Commentaires indisponibles en mode local." } }) },
    capabilities: { dueTime: true, events: true, teamAgenda: false },
    teamAgenda: async () => ({ ok: false, error: { kind: "invalid", message: "Agenda collectif indisponible en mode local." } }),
    local: active ? { clearAll: () => set(EMPTY), addMany: (list) => set([...latest(), ...list]) } : null,
  };
}
