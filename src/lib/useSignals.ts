"use client";
import { useCallback } from "react";
import { useLocalStorage } from "@/lib/useLocalStorage";

/**
 * Signaux déjà consultés (mémoire locale de démonstration). Masque l'indicateur NEW, ne supprime jamais un contenu.
 * `publishedIds` vient du serveur : le client ne connaît jamais les brouillons.
 */
export function useSignals(publishedIds: string[] = []) {
  const [seen, setSeen, latest] = useLocalStorage<string[]>("skyline.signal.seen.v1", []);
  // Part de la dernière valeur stockée (jamais d'un instantané périmé) : ne peut pas effacer d'autres signaux déjà consultés.
  const markSeen = useCallback((id: string) => { const cur = latest(); if (!cur.includes(id)) setSeen([...cur, id]); }, [latest, setSeen]);
  return { seen, unseen: publishedIds.filter((id) => !seen.includes(id)), markSeen, isSeen: (id: string) => seen.includes(id) };
}
