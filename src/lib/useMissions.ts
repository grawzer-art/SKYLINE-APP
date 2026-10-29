"use client";
import { useCallback, useMemo } from "react";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { activeMembers } from "@/data/staff";
import { canDelete, changeStatus as changeStatusRule, createMission, updateMission, type Actor, type Mission, type MissionInput, type MissionStatus } from "@/domain/missions";

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
  const [missions, set, latest] = useLocalStorage<Mission[]>(MISSIONS_KEY, EMPTY);
  const ids = useMemo(() => activeMembers().map((m) => m.id), []);
  const write = (fn: (all: Mission[]) => Mission[]) => set(fn(latest()));

  const create = useCallback((input: MissionInput, a: Actor): Res => {
    const r = createMission(input, a, ids, nowISO(), newId()); if (!r.ok) return r;
    set([...latest(), r.value]); return { ok: true, mission: r.value };
  }, [ids, set, latest]);
  const update = useCallback((id: string, input: MissionInput, a: Actor): Res => {
    const m = latest().find((x) => x.id === id); if (!m) return { ok: false, reason: "Mission introuvable." };
    const r = updateMission(m, input, a, ids, nowISO()); if (!r.ok) return r;
    set(latest().map((x) => (x.id === id ? r.value : x))); return { ok: true, mission: r.value };
  }, [ids, set, latest]);
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
  const clearAll = useCallback(() => set(EMPTY), [set]);
  const addMany = useCallback((list: Mission[]) => write((all) => [...all, ...list]), []); // eslint-disable-line react-hooks/exhaustive-deps

  return { missions, create, update, setStatus, remove, clearAll, addMany };
}
