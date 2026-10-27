"use client";
import { useCallback, useMemo } from "react";
import { seedIncoming, seedIntro, seedMessages, type ChatMsg, type Phase } from "@/data/v3";
import type { Locale } from "@/i18n";
import { useLocalStorage } from "@/lib/useLocalStorage";

/**
 * État du PROTOTYPE V3 : mémoire locale de l'appareil uniquement. Aucun compte, aucun envoi réel.
 * Les règles métier vivent dans `src/domain/community.ts` ; les actions dans `useCommunity` (futur contrat serveur).
 */
export type Outgoing = { state: "sent" | "accepted"; at: number; intro: string };

export type Proto = {
  phase: Phase;
  locale: Locale;
  /** Simulation de ce que fournirait le serveur (équipe SKYLINE) : réservation et média autorisé. */
  sim: { reservation: "confirmed" | "pending"; tone: boolean; trip: boolean };
  community: { adult: boolean; charter: boolean; consent: boolean };
  me: { pseudo: string; city: string; bio: string; genres: string[]; visible: boolean };
  settings: { contact: "members" | "nobody"; notifMessages: boolean; notifSignal: boolean };
  outgoing: Record<string, Outgoing>;
  incoming: Record<string, "pending" | "accepted" | "declined">;
  intros: Record<string, string>;
  blocked: string[];
  reported: string[];
  muted: string[];
  deleted: string[];
  unread: Record<string, number>;
  messages: Record<string, ChatMsg[]>;
  tipDismissed: boolean;
};

export const defaultProto: Proto = {
  phase: "before",
  locale: "fr",
  sim: { reservation: "confirmed", tone: false, trip: false },
  community: { adult: false, charter: false, consent: false },
  me: { pseudo: "Alex", city: "Paris", bio: "", genres: ["House"], visible: false },
  settings: { contact: "members", notifMessages: true, notifSignal: true },
  outgoing: { m1: { state: "accepted", at: 0, intro: "" }, m2: { state: "accepted", at: 0, intro: "" } },
  incoming: { ...seedIncoming },
  intros: { ...seedIntro },
  blocked: [], reported: [], muted: [], deleted: [],
  unread: { m1: 1, m2: 0 },
  messages: seedMessages,
  tipDismissed: false,
};

const withDefaults = (raw: Proto): Proto => ({
  ...defaultProto, ...raw,
  sim: { ...defaultProto.sim, ...raw.sim }, community: { ...defaultProto.community, ...raw.community },
  me: { ...defaultProto.me, ...raw.me }, settings: { ...defaultProto.settings, ...raw.settings },
});

export function useProto() {
  const [raw, set, latest] = useLocalStorage<Proto>("skyline.v3.proto.v2", defaultProto);
  const state = useMemo<Proto>(() => withDefaults(raw), [raw]);
  // Toute modification part de la dernière valeur stockée : pendant l'hydratation, `state` peut encore être l'état serveur par défaut.
  const update = useCallback((fn: (p: Proto) => Proto) => set(fn(withDefaults(latest()))), [set, latest]);
  const reset = useCallback(() => set(defaultProto), [set]);
  return { state, update, reset };
}
