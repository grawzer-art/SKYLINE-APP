"use client";
import { useCallback, useMemo } from "react";
import { members as allMembers, type ChatMsg, type Member } from "@/data/v3";
import {
  LIMITS, canRequestContact, isEligible, isRateLimited, missingConditions, requestsRemaining, validateIntro, validateMessage, validatePseudo,
  type Eligibility, type MessageProblem, type RequestBlock,
} from "@/domain/community";
import { translate, type TKey, type Vars } from "@/i18n";
import { useClock } from "@/lib/useClock";
import { useProto, type Proto } from "@/lib/useProto";

/** Horloge injectable : les tests et le futur serveur contrôlent le temps. */
const now = () => Date.now();

export type SendResult = { ok: true } | { ok: false; reason: MessageProblem | "rate" | "offline" | "paused" | "forbidden" };
export type RequestResult = { ok: true } | { ok: false; reason: RequestBlock | MessageProblem | "paused" };

/**
 * « Contrat » communautaire côté interface : chaque action applique les règles du domaine puis écrit l'état local.
 * Dans la version réelle, ces mêmes fonctions deviennent des appels serveur (qui REVALIDENT toutes les règles).
 */
export function useCommunity() {
  const { state, update, reset } = useProto();

  const eligibility: Eligibility = useMemo(() => ({
    reservationConfirmed: state.sim.reservation === "confirmed",
    accountActive: true,
    adult: state.community.adult,
    charter: state.community.charter,
    consent: state.community.consent,
  }), [state.sim.reservation, state.community]);
  const eligible = isEligible(eligibility);
  const missing = missingConditions(eligibility);

  const t = useCallback((key: TKey, vars?: Vars) => translate(state.locale, key, vars), [state.locale]);

  const member = useCallback((id: string): Member | undefined => allMembers.find((m) => m.id === id), []);

  const linked = useCallback((id: string) => state.outgoing[id]?.state === "accepted" || state.incoming[id] === "accepted", [state.outgoing, state.incoming]);

  /** Conversations visibles : contacts acceptés, non bloqués, non supprimés de mon côté. */
  const conversations = useMemo(() => {
    const ids = new Set<string>();
    for (const [id, o] of Object.entries(state.outgoing)) if (o.state === "accepted") ids.add(id);
    for (const [id, v] of Object.entries(state.incoming)) if (v === "accepted") ids.add(id);
    return Array.from(ids).filter((id) => !state.blocked.includes(id) && !state.deleted.includes(id));
  }, [state.outgoing, state.incoming, state.blocked, state.deleted]);

  const pendingRequests = useMemo(() => Object.entries(state.incoming).filter(([id, v]) => v === "pending" && !state.blocked.includes(id)).map(([id]) => id), [state.incoming, state.blocked]);
  const unreadTotal = conversations.reduce((n, id) => n + (state.muted.includes(id) ? 0 : state.unread[id] ?? 0), 0);

  const sentTimes = useMemo(() => Object.values(state.outgoing).map((o) => o.at).filter((a) => a > 0), [state.outgoing]);
  const pendingOut = Object.values(state.outgoing).filter((o) => o.state === "sent").length;
  const clock = useClock();
  const quotaLeft = clock === 0 ? LIMITS.requestsPerDay : requestsRemaining(sentTimes, clock);

  /* ----- Profil ----- */
  const setMe = (patch: Partial<Proto["me"]>) => update((s) => ({ ...s, me: { ...s.me, ...patch } }));
  const pseudoCheck = (p: string) => validatePseudo(p);
  const toggleGenre = (g: string) => update((s) => {
    const has = s.me.genres.includes(g);
    if (!has && s.me.genres.length >= LIMITS.genresMax) return s;
    return { ...s, me: { ...s.me, genres: has ? s.me.genres.filter((x) => x !== g) : [...s.me.genres, g] } };
  });
  const setVisible = (visible: boolean) => update((s) => ({ ...s, me: { ...s.me, visible: visible && eligibleOf(s) } }));
  const eligibleOf = (s: Proto) => isEligible({ reservationConfirmed: s.sim.reservation === "confirmed", accountActive: true, ...s.community });

  /* ----- Activation / retrait de la communauté ----- */
  const setCommunity = (patch: Partial<Proto["community"]>) => update((s) => ({ ...s, community: { ...s.community, ...patch } }));
  /** Retrait : profil masqué, conversations en pause (rien n'est supprimé). */
  const leave = () => update((s) => ({ ...s, community: { ...s.community, consent: false }, me: { ...s.me, visible: false } }));

  /* ----- Contacts ----- */
  const requestContact = (id: string, introRaw: string): RequestResult => {
    if (!eligible) return { ok: false, reason: "paused" };
    const intro = validateIntro(introRaw);
    if (!intro.ok) return { ok: false, reason: intro.reason };
    const gate = canRequestContact({ sentAt: sentTimes, pendingCount: pendingOut, now: now(), alreadyLinked: linked(id) || !!state.outgoing[id], blocked: state.blocked.includes(id), self: false });
    if (!gate.ok) return gate;
    update((s) => ({ ...s, outgoing: { ...s.outgoing, [id]: { state: "sent", at: now(), intro: intro.text } } }));
    return { ok: true };
  };
  const cancelRequest = (id: string) => update((s) => { const o = { ...s.outgoing }; if (o[id]?.state === "sent") delete o[id]; return { ...s, outgoing: o }; });
  const answerRequest = (id: string, accept: boolean) => update((s) => ({ ...s, incoming: { ...s.incoming, [id]: accept ? "accepted" : "declined" } }));

  /* ----- Messages ----- */
  const messagesOf = (id: string): ChatMsg[] => state.messages[id] ?? [];
  const send = (id: string, raw: string, online = true): SendResult => {
    if (!eligible) return { ok: false, reason: "paused" };
    if (!linked(id) || state.blocked.includes(id)) return { ok: false, reason: "forbidden" };
    if (!online) return { ok: false, reason: "offline" };
    const v = validateMessage(raw);
    if (!v.ok) return v;
    const times = messagesOf(id).filter((m) => m.from === "me" && m.ts).map((m) => m.ts as number);
    if (isRateLimited(times, now())) return { ok: false, reason: "rate" };
    update((s) => ({ ...s, messages: { ...s.messages, [id]: [...(s.messages[id] ?? []), { from: "me", text: v.text, t: translate(s.locale, "chat.now"), ts: now() }] } }));
    return { ok: true };
  };
  const markRead = (id: string) => { if ((state.unread[id] ?? 0) > 0) update((s) => ({ ...s, unread: { ...s.unread, [id]: 0 } })); };
  const toggleMute = (id: string) => update((s) => ({ ...s, muted: s.muted.includes(id) ? s.muted.filter((x) => x !== id) : [...s.muted, id] }));
  const deleteConversation = (id: string) => update((s) => ({ ...s, deleted: [...s.deleted, id] }));
  const dismissTip = () => update((s) => ({ ...s, tipDismissed: true }));

  /* ----- Modération ----- */
  const block = (id: string) => update((s) => ({ ...s, blocked: s.blocked.includes(id) ? s.blocked : [...s.blocked, id] }));
  const unblock = (id: string) => update((s) => ({ ...s, blocked: s.blocked.filter((b) => b !== id) }));
  const report = (id: string) => update((s) => ({ ...s, reported: s.reported.includes(id) ? s.reported : [...s.reported, id] }));

  return {
    state, update, reset, t, eligibility, eligible, missing, member, linked,
    conversations, pendingRequests, unreadTotal, quotaLeft, pendingOut,
    setMe, pseudoCheck, toggleGenre, setVisible, setCommunity, leave,
    requestContact, cancelRequest, answerRequest, messagesOf, send, markRead, toggleMute, deleteConversation, dismissTip, block, unblock, report,
  };
}
