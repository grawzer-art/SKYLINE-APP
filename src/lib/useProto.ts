"use client";
import { useCallback, useMemo } from "react";
import { seedIncoming, seedMessages, type ChatMsg, type Phase } from "@/data/v3";
import { useLocalStorage } from "@/lib/useLocalStorage";

/** État du PROTOTYPE V3 : mémoire locale de l'appareil uniquement. Aucun compte, aucun envoi réel. */
export type Proto = {
  phase: Phase;
  me: { pseudo: string; city: string; bio: string; genres: string[]; visible: boolean; showPhoto: boolean };
  settings: { contact: "members" | "nobody"; notifMessages: boolean; notifSignal: boolean };
  outgoing: Record<string, "sent" | "accepted">;
  incoming: Record<string, "pending" | "accepted" | "declined">;
  blocked: string[];
  reported: string[];
  messages: Record<string, ChatMsg[]>;
};

export const defaultProto: Proto = {
  phase: "before",
  me: { pseudo: "Alex", city: "Paris", bio: "", genres: ["House"], visible: false, showPhoto: false },
  settings: { contact: "members", notifMessages: true, notifSignal: true },
  outgoing: { m1: "accepted", m2: "accepted" },
  incoming: { ...seedIncoming },
  blocked: [],
  reported: [],
  messages: seedMessages,
};

export function useProto() {
  const [raw, set] = useLocalStorage<Proto>("skyline.v3.proto.v1", defaultProto);
  const state = useMemo<Proto>(() => ({ ...defaultProto, ...raw, me: { ...defaultProto.me, ...raw.me }, settings: { ...defaultProto.settings, ...raw.settings } }), [raw]);
  const update = useCallback((fn: (p: Proto) => Proto) => set(fn(state)), [set, state]);
  const reset = useCallback(() => set(defaultProto), [set]);
  return { state, update, reset };
}
