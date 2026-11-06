"use client";
import { useCallback, useMemo } from "react";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { useDemoStatus } from "@/components/staff/SpaceSwitcher";
import { useMissions } from "@/lib/missions/MissionsProvider";
import { canManageEvent, createEvent, validateEventInput, type AgendaEvent, type EventInput } from "@/domain/agenda";

/**
 * RÉUNIONS ET ÉVÉNEMENTS (type distinct des missions). Phase 1 : MODE LOCAL uniquement (stockage de l'appareil, séparé par compte en mode Supabase).
 * Source « base de données » : aucune table d'événements tant que la migration B3 (proposée, non appliquée) n'est pas validée → `supported = false`,
 * liste vide, aucune écriture, aucun stockage local : jamais de faux événement présenté comme partagé.
 */
const KEY = "skyline.staff.agenda.events.v1";
const EMPTY: AgendaEvent[] = [];
const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `ev-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`);
type Res = { ok: true; event: AgendaEvent } | { ok: false; reason: string };

export function useAgendaEvents() {
  const st = useDemoStatus(); const M = useMissions(); const supported = M.capabilities.events && M.source === "local";
  const key = !supported ? `${KEY}:inactive` : st === undefined || (st.mode === "supabase" && !st.session?.memberId) ? `${KEY}:pending` : st.mode === "supabase" ? `${KEY}:db:${st.session?.memberId}` : KEY;
  const [stored, set, latest] = useLocalStorage<AgendaEvent[]>(key, EMPTY);
  const events = useMemo(() => (supported ? stored : EMPTY), [supported, stored]);
  const create = useCallback((i: EventInput, me: string): Res => {
    if (!supported) return { ok: false, reason: "Les événements ne sont pas disponibles avec cette source de données." };
    const r = createEvent(i, me, new Date().toISOString(), newId()); if (!r.ok) return r;
    set([...latest(), r.value]); return { ok: true, event: r.value };
  }, [supported, set, latest]);
  const update = useCallback((id: string, i: EventInput, me: string, coordinator: boolean): Res => {
    const e = latest().find((x) => x.id === id); if (!supported || !e) return { ok: false, reason: "Événement introuvable." };
    if (!canManageEvent(e, me, coordinator) || e.creatorId !== me) return { ok: false, reason: "Seul le créateur peut modifier cet événement." };
    const v = validateEventInput(i); if (!v.ok) return { ok: false, reason: Object.values(v.errors)[0] ?? "Événement invalide." };
    const next = { ...e, ...v.value }; set(latest().map((x) => (x.id === id ? next : x))); return { ok: true, event: next };
  }, [supported, set, latest]);
  const remove = useCallback((id: string, me: string, coordinator: boolean): { ok: boolean; reason?: string } => {
    const e = latest().find((x) => x.id === id); if (!supported || !e) return { ok: false, reason: "Événement introuvable." };
    if (!canManageEvent(e, me, coordinator)) return { ok: false, reason: "Vous ne pouvez pas supprimer cet événement." };
    set(latest().filter((x) => x.id !== id)); return { ok: true };
  }, [supported, set, latest]);
  return { supported, events, create, update, remove };
}
