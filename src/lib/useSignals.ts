"use client";
import { useCallback } from "react";
import { signals } from "@/data/demo";
import { useLocalStorage } from "@/lib/useLocalStorage";

/** Révélations déjà ouvertes (persistance locale — démo). Aucune récompense, aucun score. */
export function useSignals() {
  const [seen, setSeen] = useLocalStorage<string[]>("skyline.signal.seen.v1", []);
  const markSeen = useCallback((id: string) => { if (!seen.includes(id)) setSeen([...seen, id]); }, [seen, setSeen]);
  const unseen = signals.filter((s) => !seen.includes(s.id));
  return { seen, unseen, markSeen, isSeen: (id: string) => seen.includes(id) };
}
