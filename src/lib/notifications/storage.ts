"use client";
import { useCallback, useMemo } from "react";
import { useLocalStorage } from "@/lib/useLocalStorage";

/**
 * État de lecture et préférences : stockés SUR L'APPAREIL en phase 1 (clé par compte). Ce n'est pas de la donnée métier : jamais de contenu de
 * mission ici, seulement des identifiants de notifications lues et des réglages. Table serveur `notification_reads` / `notification_preferences`
 * proposée (migration B3, non appliquée) pour une synchronisation entre appareils.
 */
const EMPTY: string[] = []; const CAP = 400;
export function useReadSet(key: string) {
  const [arr, set, latest] = useLocalStorage<string[]>(key, EMPTY);
  const read = useMemo(() => new Set(arr), [arr]);
  const markRead = useCallback((ids: string[]) => { const cur = latest(); const next = [...new Set([...cur, ...ids])].slice(-CAP); if (next.length !== cur.length) set(next); }, [latest, set]);
  return { read: read as ReadonlySet<string>, markRead };
}
export function usePrefs<T>(key: string, normalize: (raw: unknown) => T, fallback: T) {
  const [raw, set, latest] = useLocalStorage<unknown>(key, null);
  const prefs = useMemo(() => normalize(raw), [raw, normalize]);
  const update = useCallback((patch: (p: T) => T) => set(patch(normalize(latest()))), [set, latest, normalize]);
  return { prefs: raw === null ? fallback : prefs, update };
}
export const useFlag = (key: string) => { const [v, set] = useLocalStorage<boolean>(key, false); return [v, set] as const; };
