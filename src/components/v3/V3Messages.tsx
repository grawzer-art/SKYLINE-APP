"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, BellOff, Search, X } from "lucide-react";
import { Empty } from "./ui";
import { Face } from "./visual";
import { CommunityGate } from "./community";
import { Button } from "@/components/ui/Button";
import { useCommunity } from "@/lib/useCommunity";
import { cn } from "@/lib/cn";

/** MESSAGES : conversations et demandes. Sobre, lisible, adulte — l'état de chaque échange se lit d'un coup d'œil. */
export function V3Messages() {
  const c = useCommunity();
  const { t, state } = c;
  const [tab, setTab] = useState<"chats" | "requests">("chats");
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState("");
  const gate = { eyebrow: t("messages.eyebrow"), title: t("messages.title"), back: { href: "/v3/club", label: t("common.club") } };
  const nReq = c.pendingRequests.length;

  const rows = useMemo(() => c.conversations.filter((id) => !q.trim() || (c.member(id)?.pseudo ?? "").toLowerCase().includes(q.trim().toLowerCase())), [c, q]);
  const tabs = [["chats", t("messages.tab.chats"), c.conversations.length], ["requests", t("messages.tab.requests"), nReq]] as const;

  return (
    <CommunityGate {...gate}>
      <header className="px-5 pt-[calc(var(--safe-top)+5.5rem)]">
        <div className="flex items-center justify-between">
          <Link href="/v3/club" className="-ml-1 inline-flex min-h-11 items-center gap-2 font-mono text-[0.72rem] uppercase tracking-[0.18em] text-dim hover:text-cloud"><ArrowLeft size={16} strokeWidth={1.5} aria-hidden />{t("common.club")}</Link>
          <button type="button" onClick={() => { setSearching((s) => !s); setQ(""); }} aria-expanded={searching} aria-label={t("messages.search")} className="grid size-11 place-items-center rounded-full border border-cloud/25 transition active:scale-95">{searching ? <X size={18} strokeWidth={1.5} aria-hidden /> : <Search size={18} strokeWidth={1.5} aria-hidden />}</button>
        </div>
        <h1 className="font-display mt-3 text-[clamp(2rem,10.5vw,3rem)] leading-none">{t("messages.title")}</h1>
        {searching && (
          <div className="mt-4">
            <label htmlFor="msg-search" className="sr-only">{t("messages.search.placeholder")}</label>
            <input id="msg-search" autoFocus type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("messages.search.placeholder")} className="min-h-12 w-full rounded-[8px] border border-line bg-surface-1 px-4 text-[1rem] outline-none focus:border-sky" />
          </div>
        )}
        <div role="tablist" aria-label={t("messages.title")} className="mt-6 flex gap-8 border-b border-line">
          {tabs.map(([k, l, n]) => (
            <button key={k} role="tab" id={`tab-${k}`} aria-controls={`panel-${k}`} type="button" aria-selected={tab === k} onClick={() => setTab(k)}
              className={cn("relative -mb-px flex min-h-12 items-center gap-2 border-b-2 pb-0.5 font-mono text-[0.72rem] uppercase tracking-[0.16em] transition", tab === k ? "border-sky text-cloud" : "border-transparent text-cloud/68")}>
              {l}{n > 0 && <span className={cn("grid min-w-5 place-items-center rounded-full px-1.5 py-0.5 text-[0.7rem]", tab === k ? "bg-sky text-jet" : "bg-cloud/15 text-cloud/80")} aria-label={String(n)}>{n}</span>}
            </button>
          ))}
        </div>
      </header>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="px-5 pt-2">
        {tab === "chats" ? (
          c.conversations.length === 0 ? <div className="pt-6"><Empty title={t("messages.empty.title")} text={t("messages.empty.text")} /></div>
          : rows.length === 0 ? <p role="status" className="pt-8 text-center text-[0.9rem] text-dim">{t("messages.search.none")}</p>
          : (
            <ul className="divide-y divide-line">
              {rows.map((id) => {
                const m = c.member(id); const msgs = c.messagesOf(id); const last = msgs[msgs.length - 1];
                const unread = state.unread[id] ?? 0; const muted = state.muted.includes(id); const hot = unread > 0 && !muted;
                return (
                  <li key={id}>
                    <Link href={`/v3/club/messages/${id}`} className="flex min-h-[4.9rem] items-center gap-4 py-3.5">
                      <Face name={m?.pseudo ?? "?"} size={54} tone={hot ? "sky" : "silver"} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2"><span className={cn("text-[1.02rem]", hot && "font-medium")}>{m?.pseudo}</span>{muted && <BellOff size={13} strokeWidth={1.5} aria-label={t("messages.muted")} className="text-silver" />}</span>
                        <span className={cn("mt-0.5 block truncate text-[0.86rem]", hot ? "text-cloud/90" : "text-cloud/68")}>{last ? `${last.from === "me" ? t("messages.you") : ""}${last.text}` : t("messages.new")}</span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-2">
                        {last && <span className="font-mono text-[0.7rem] uppercase tracking-[0.12em] text-dim">{last.t}</span>}
                        {hot ? <span className="inline-flex items-center gap-1.5 font-mono text-[0.7rem] uppercase tracking-[0.12em] text-sky"><span aria-hidden className="size-2 rounded-full bg-sky" />{t("messages.unread", { count: unread })}</span> : <span aria-hidden className="h-2" />}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )
        ) : nReq === 0 ? <div className="pt-6"><Empty title={t("messages.req.empty.title")} text={t("messages.req.empty.text")} /></div> : (
          <ul className="space-y-3 pt-4">
            {c.pendingRequests.map((id) => {
              const m = c.member(id);
              return (
                <li key={id} className="rounded-[6px] border border-cloud/15 p-4">
                  <div className="flex items-center gap-4"><Face name={m?.pseudo ?? "?"} size={52} tone="silver" /><div><p className="text-[1.02rem]">{m?.pseudo}</p><p className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-dim">{m?.city}</p></div></div>
                  {state.intros[id] && <p className="mt-3.5 border-l-2 border-sky/60 pl-4 text-[0.92rem] italic leading-snug text-cloud/85">« {state.intros[id]} »</p>}
                  <Link href={`/v3/club/members/${id}`} className="mt-1.5 inline-flex min-h-11 items-center font-mono text-[0.72rem] uppercase tracking-[0.16em] text-sky">{t("messages.req.view")} →</Link>
                  <div className="grid grid-cols-2 gap-3">
                    <Button onClick={() => c.answerRequest(id, true)} className="min-h-11 px-3 text-[0.72rem]">{t("messages.req.accept")}</Button>
                    <Button variant="ghost" onClick={() => c.answerRequest(id, false)} className="min-h-11 px-3 text-[0.72rem]">{t("messages.req.decline")}</Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {state.settings.contact === "nobody" && <p className="mt-5 border-l border-sky pl-4 text-[0.78rem] text-dim">{t("messages.nobody")}</p>}
      </div>
      <p className="px-5 pb-4 pt-6 text-[0.75rem] text-dim">{t("messages.footer")}</p>
    </CommunityGate>
  );
}
