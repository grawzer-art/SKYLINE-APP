"use client";
import { useCallback, useSyncExternalStore } from "react";

const EVENT = "skyline:storage";
const cache = new Map<string, { raw: string | null; value: unknown }>();

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    const hit = cache.get(key);
    if (hit && hit.raw === raw) return hit.value as T; // référence stable → pas de re-render inutile
    const value = raw === null ? fallback : (JSON.parse(raw) as T);
    cache.set(key, { raw, value });
    return value;
  } catch {
    return fallback; // stockage indisponible (navigation privée…) : on reste en mémoire vive
  }
}

/** Persistance locale temporaire (démo). SSR-safe via useSyncExternalStore. */
export function useLocalStorage<T>(key: string, fallback: T) {
  const subscribe = useCallback((cb: () => void) => {
    window.addEventListener("storage", cb);
    window.addEventListener(EVENT, cb);
    return () => { window.removeEventListener("storage", cb); window.removeEventListener(EVENT, cb); };
  }, []);
  const value = useSyncExternalStore(subscribe, () => read(key, fallback), () => fallback);
  const set = useCallback((next: T) => {
    try { window.localStorage.setItem(key, JSON.stringify(next)); } catch { cache.set(key, { raw: JSON.stringify(next), value: next }); }
    window.dispatchEvent(new Event(EVENT));
  }, [key]);
  /** Dernière valeur RÉELLEMENT stockée (jamais un instantané périmé) : à utiliser pour toute modification « lecture → écriture ». */
  const latest = useCallback(() => read(key, fallback), [key, fallback]);
  return [value, set, latest] as const;
}
