"use client";
import Link from "next/link";
import { useState } from "react";
import { BellOff } from "lucide-react";
import { ScreenTitle, Block, Initials, Empty } from "./ui";
import { CommunityGate } from "./community";
import { Button } from "@/components/ui/Button";
import { useCommunity } from "@/lib/useCommunity";
import { cn } from "@/lib/cn";

/** MESSAGES : conversations (contacts acceptés) et demandes reçues, avec leur mot d'introduction. Disponible dès l'éligibilité, avant le voyage. */
export function V3Messages() {
  const c = useCommunity();
  const { t, state } = c;
  const [tab, setTab] = useState<"chats" | "requests">("chats");
  const gate = { eyebrow: t("messages.eyebrow"), title: t("messages.title"), back: { href: "/v3/club", label: t("common.club") } };
  const nReq = c.pendingRequests.length;

  return (
    <CommunityGate {...gate}>
      <ScreenTitle {...gate} />
      <Block>
        <div role="tablist" aria-label={t("messages.title")} className="grid grid-cols-2 border border-line">
          {([["chats", t("messages.tab.chats")], ["requests", nReq ? t("messages.tab.requests.n", { n: nReq }) : t("messages.tab.requests")]] as const).map(([k, l]) => (
            <button key={k} role="tab" id={`tab-${k}`} aria-controls={`panel-${k}`} type="button" aria-selected={tab === k} onClick={() => setTab(k)}
              className={cn("min-h-12 font-mono text-[0.64rem] uppercase tracking-[0.16em] transition", tab === k ? "bg-cloud text-jet" : "text-cloud/70")}>{l}</button>
          ))}
        </div>
      </Block>
      <Block className="pt-4">
        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === "chats" ? (
            c.conversations.length === 0 ? <Empty title={t("messages.empty.title")} text={t("messages.empty.text")} /> : (
              <ul className="divide-y divide-line border-y border-line">
                {c.conversations.map((id) => {
                  const m = c.member(id); const msgs = c.messagesOf(id); const last = msgs[msgs.length - 1];
                  const unread = state.unread[id] ?? 0; const muted = state.muted.includes(id);
                  return (
                    <li key={id}>
                      <Link href={`/v3/club/messages/${id}`} className="flex min-h-[4.5rem] items-center gap-4 py-3">
                        <Initials name={m?.pseudo ?? "?"} size={44} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2 text-[0.98rem]">{m?.pseudo}{muted && <BellOff size={13} strokeWidth={1.5} aria-label={t("messages.muted")} className="text-silver" />}</span>
                          <span className={cn("block truncate text-[0.82rem]", unread && !muted ? "text-cloud" : "text-dim")}>{last ? `${last.from === "me" ? t("messages.you") : ""}${last.text}` : t("messages.new")}</span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1.5">
                          {last && <span className="font-mono text-[0.54rem] uppercase tracking-[0.12em] text-dim">{last.t}</span>}
                          {unread > 0 && !muted && <span className="border border-sky/60 px-1.5 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.12em] text-sky">{t("messages.unread", { count: unread })}</span>}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )
          ) : nReq === 0 ? <Empty title={t("messages.req.empty.title")} text={t("messages.req.empty.text")} /> : (
            <ul className="divide-y divide-line border-y border-line">
              {c.pendingRequests.map((id) => {
                const m = c.member(id);
                return (
                  <li key={id} className="py-4">
                    <div className="flex items-center gap-4"><Initials name={m?.pseudo ?? "?"} size={44} /><div><p className="text-[0.98rem]">{m?.pseudo}</p><p className="text-[0.8rem] text-dim">{t("messages.req.wants")}</p></div></div>
                    {state.intros[id] && <p className="mt-3 border-l border-cloud/25 pl-4 text-[0.88rem] italic text-cloud/80">“{state.intros[id]}”</p>}
                    <Link href={`/v3/club/members/${id}`} className="mt-2 inline-flex min-h-11 items-center font-mono text-[0.6rem] uppercase tracking-[0.16em] text-sky">{t("messages.req.view")} →</Link>
                    <div className="mt-1 grid grid-cols-2 gap-3">
                      <Button onClick={() => c.answerRequest(id, true)} className="min-h-11 px-3 text-[0.64rem]">{t("messages.req.accept")}</Button>
                      <Button variant="ghost" onClick={() => c.answerRequest(id, false)} className="min-h-11 px-3 text-[0.64rem]">{t("messages.req.decline")}</Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {state.settings.contact === "nobody" && <p className="mt-4 border-l border-sky pl-4 text-[0.78rem] text-dim">{t("messages.nobody")}</p>}
      </Block>
      <p className="px-5 pb-6 pt-4 text-[0.72rem] text-dim">{t("messages.footer")}</p>
    </CommunityGate>
  );
}
