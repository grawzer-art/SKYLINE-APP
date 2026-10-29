"use client";
import { useCallback, useMemo } from "react";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { activeMembers, validatorIds } from "@/data/staff";
import { archiveMission, assignMission, canDelete, changeStatus as changeStatusRule, createMission, normalizeMission, resolveAssignment, updateMission, type Actor, type Mission, type MissionInput, type MissionStatus } from "@/domain/missions";

/**
 * MISSIONS — persistance LOCALE à cet appareil (localStorage). Ce n'est PAS une synchronisation : Tom, Graw et Qafard ne se voient
 * pas entre eux. Même interface que la future API serveur (voir docs/skyline-staff/MISSIONS.md) : seules ces fonctions changeront.
 */
export const MISSIONS_KEY = "skyline.staff.missions.v1";
const EMPTY: Mission[] = [];
type Res = { ok: true; mission: Mission } | { ok: false; reason: string };
const nowISO = () => new Date().toISOString();
const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `m-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`);

export function useMissions() {
  const [stored, set, latestStored] = useLocalStorage<Mission[]>(MISSIONS_KEY, EMPTY);
  // Missions V1 (sans proposition ni archive) : champs complétés à la lecture, rien n'est supprimé.
  const missions = useMemo(() => stored.map(normalizeMission), [stored]);
  const latest = useCallback(() => latestStored().map(normalizeMission), [latestStored]);
  const ids = useMemo(() => activeMembers().map((m) => m.id), []);
  const vids = useMemo(() => validatorIds(), []);

  const create = useCallback((input: MissionInput, a: Actor): Res => {
    const r = createMission(input, a, ids, nowISO(), newId(), vids); if (!r.ok) return r;
    set([...latest(), r.value]); return { ok: true, mission: r.value };
  }, [ids, vids, set, latest]);
  const update = useCallback((id: string, input: MissionInput, a: Actor): Res => {
    const m = latest().find((x) => x.id === id); if (!m) return { ok: false, reason: "Mission introuvable." };
    const r = updateMission(m, input, a, ids, nowISO(), vids); if (!r.ok) return r;
    set(latest().map((x) => (x.id === id ? r.value : x))); return { ok: true, mission: r.value };
  }, [ids, vids, set, latest]);
  const setStatus = useCallback((id: string, to: MissionStatus, a: Actor, note?: string): Res => {
    const m = latest().find((x) => x.id === id); if (!m) return { ok: false, reason: "Mission introuvable." };
    const r = changeStatusRule(m, to, a, nowISO(), note); if (!r.ok) return r;
    set(latest().map((x) => (x.id === id ? r.value : x))); return { ok: true, mission: r.value };
  }, [set, latest]);
  const remove = useCallback((id: string, a: Actor): { ok: boolean; reason?: string } => {
    const m = latest().find((x) => x.id === id); if (!m) return { ok: false, reason: "Mission introuvable." };
    if (!canDelete(a, m)) return { ok: false, reason: "Vous ne pouvez pas supprimer cette mission." };
    set(latest().filter((x) => x.id !== id)); return { ok: true };
  }, [set, latest]);
  const assign = useCallback((id: string, assigneeId: string, a: Actor): Res => {
    const m = latest().find((x) => x.id === id); if (!m) return { ok: false, reason: "Mission introuvable." };
    const r = assignMission(m, assigneeId, a, ids, nowISO()); if (!r.ok) return r;
    set(latest().map((x) => (x.id === id ? r.value : x))); return { ok: true, mission: r.value };
  }, [ids, set, latest]);
  const resolve = useCallback((id: string, approve: boolean, a: Actor, note?: string): Res => {
    const m = latest().find((x) => x.id === id); if (!m) return { ok: false, reason: "Mission introuvable." };
    const r = resolveAssignment(m, approve, a, nowISO(), note); if (!r.ok) return r;
    set(latest().map((x) => (x.id === id ? r.value : x))); return { ok: true, mission: r.value };
  }, [set, latest]);
  const archive = useCallback((id: string, a: Actor): Res => {
    const m = latest().find((x) => x.id === id); if (!m) return { ok: false, reason: "Mission introuvable." };
    const r = archiveMission(m, a, nowISO()); if (!r.ok) return r;
    set(latest().map((x) => (x.id === id ? r.value : x))); return { ok: true, mission: r.value };
  }, [set, latest]);
  const clearAll = useCallback(() => set(EMPTY), [set]);
  const addMany = useCallback((list: Mission[]) => set([...latest(), ...list]), [set, latest]);

  return { missions, create, update, setStatus, assign, resolve, archive, remove, clearAll, addMany };
}
