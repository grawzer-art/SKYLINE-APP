"use client";
import { useCallback, useEffect, useState } from "react";
import { addDays, startOfWeek } from "@/domain/agenda";
import type { SharedEntry } from "@/domain/agenda";
import type { MissionsApi } from "@/lib/missions/types";

/**
 * Agenda COLLECTIF (schéma B3 uniquement) : planning de l'équipe pour la semaine affichée, via la fonction de lecture minimale `list_team_agenda`
 * (titre, responsable, date, heure, statut, priorité). Aucun détail privé n'est lu. Chargement à chaque changement de semaine ; jamais d'écriture.
 */
type Loaded = { key: string; entries: SharedEntry[]; error: string | null };
export function useTeamAgenda(M: MissionsApi, active: boolean, anchor: string | null) {
  const enabled = active && M.capabilities.teamAgenda && !!anchor; const from = anchor ? startOfWeek(anchor) : ""; const to = from ? addDays(from, 6) : "";
  const [rev, setRev] = useState(0); const key = `${from}:${to}:${rev}:${M.missions.length}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null); const load = M.teamAgenda;
  useEffect(() => {
    if (!enabled) return; let off = false;
    void load(from, to).then((r) => { if (!off) setLoaded({ key, entries: r.ok ? r.value : [], error: r.ok ? null : r.error.message }); });
    return () => { off = true; };
  }, [enabled, from, to, key, load]);
  const current = enabled && loaded?.key === key ? loaded : null;
  return { enabled, status: !enabled ? "idle" as const : !current ? "loading" as const : current.error ? "error" as const : "ready" as const, error: current?.error ?? null, entries: current?.entries ?? (enabled && loaded && loaded.key.startsWith(`${from}:${to}:`) ? loaded.entries : []), reload: useCallback(() => setRev((v) => v + 1), []) };
}
