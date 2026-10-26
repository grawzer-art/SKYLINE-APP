"use client";
import { useCallback } from "react";
import { useLocalStorage } from "@/lib/useLocalStorage";

/**
 * Signaux déjà consultés (mémoire locale de démonstration). Masque l'indicateur NEW, ne supprime jamais un contenu.
 * `publishedIds` vient du serveur : le client ne connaît jamais les brouillons.
 */
export function useSignals(publishedIds: string[] = []) {
  const [seen, setSeen] = useLocalStorage<string[]>("skyline.signal.seen.v1", []);
  const markSeen = useCallback((id: string) => { if (!seen.includes(id)) setSeen([...seen, id]); }, [seen, setSeen]);
  return { seen, unseen: publishedIds.filter((id) => !seen.includes(id)), markSeen, isSeen: (id: string) => seen.includes(id) };
}
