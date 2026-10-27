"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Flag, MoreHorizontal, X } from "lucide-react";
import Link from "next/link";
import { ScreenTitle, Block, Empty } from "./ui";
import { Face } from "./visual";
import { CommunityGate } from "./community";
import { ReportForm } from "./ReportForm";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { LIMITS } from "@/domain/community";
import { useCommunity } from "@/lib/useCommunity";
import { closeThenGo } from "@/lib/sheetNav";
import { cn } from "@/lib/cn";

type Panel = null | "menu" | "block" | "delete" | "report" | "done" | { report: number };

const subscribeOnline = (cb: () => void) => { window.addEventListener("online", cb); window.addEventListener("offline", cb); return () => { window.removeEventListener("online", cb); window.removeEventListener("offline", cb); }; };
const useOnline = () => useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);

/** Conversation privée : texte seul, règles appliquées à l'envoi, menu (silence, suppression, blocage, signalement), signalement d'un message précis. */
export function V3Chat({ id }: { id: string }) {
  const c = useCommunity();
  const { t, state } = c;
  const router = useRouter();
  const online = useOnline();
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const end = useRef<HTMLDivElement>(null);
  const m = c.member(id);
  const msgs = c.messagesOf(id);
  const allowed = !!m && c.conversations.includes(id);

  useEffect(() => { if (allowed) c.markRead(id); }, [allowed, id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs.length]);

  const gate = { eyebrow: t("chat.eyebrow"), title: m?.pseudo ?? t("messages.title"), back: { href: "/v3/club/messages", label: t("common.messages") } };
  const submit = () => {
    const r = c.send(id, text, online);
    if (r.ok) { setText(""); setErr(null); return; }
    setErr(r.reason === "rate" ? t("chat.err.rate") : r.reason === "offline" ? t("chat.offline") : r.reason === "paused" || r.reason === "forbidden" ? t("chat.unavailable.text") : t(`chat.err.${r.reason}` as never));
  };
  const muted = state.muted.includes(id);
  const reportedIdx = typeof panel === "object" && panel ? panel.report : -1;

  return (
    <CommunityGate {...gate}>
      {!allowed ? (
        <><ScreenTitle {...gate} title={t("chat.unavailable")} /><Block><Empty title={t("chat.unavailable")} text={t("chat.unavailable.text")} /></Block></>
      ) : (
        <>
          <header className="px-5 pt-[calc(var(--safe-top)+5.5rem)]">
            <div className="flex items-center justify-between">
              <Link href="/v3/club/messages" className="-ml-1 inline-flex min-h-11 items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-dim hover:text-cloud"><ArrowLeft size={16} strokeWidth={1.5} aria-hidden />{t("common.messages")}</Link>
              <button type="button" onClick={() => setPanel("menu")} aria-haspopup="dialog" aria-label={t("chat.menu")} className="grid size-11 place-items-center rounded-full border border-cloud/25 transition active:scale-95"><MoreHorizontal size={18} strokeWidth={1.5} aria-hidden /></button>
            </div>
            <div className="mt-3 flex items-center gap-4 border-b border-line pb-5"><Face name={m?.pseudo ?? "?"} size={60} tone="sky" /><div><h1 className="font-display text-[1.7rem] leading-none">{m?.pseudo}</h1><p className="mt-1.5 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-dim">{m?.city} · {t("chat.eyebrow")}</p></div></div>
          </header>
          {!state.tipDismissed && (
            <div className="mx-5 mt-3 flex items-start gap-3 border border-sky/40 p-4">
              <div className="flex-1"><p className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-sky">{t("chat.tip.title")}</p><p className="mt-1.5 text-[0.82rem] leading-relaxed text-cloud/80">{t("chat.tip.text")}</p></div>
              <button type="button" onClick={c.dismissTip} aria-label={t("common.close")} className="grid size-11 shrink-0 place-items-center text-silver"><X size={16} strokeWidth={1.5} aria-hidden /></button>
            </div>
          )}
          <Block className="pb-44 pt-4">
            <ul aria-label={m?.pseudo} className="space-y-3">
              {msgs.map((x, i) => (
                <li key={i} className={cn("flex items-start", x.from === "me" ? "justify-end" : "justify-start gap-3")}>
                  {x.from === "them" && <Face name={m?.pseudo ?? "?"} size={30} tone="none" className="mt-1" />}
                  <p className={cn("max-w-[74%] px-4 py-2.5 text-[0.92rem] leading-snug [overflow-wrap:anywhere]", x.from === "me" ? "rounded-[18px] rounded-br-[4px] bg-cloud text-jet" : "rounded-[18px] rounded-bl-[4px] border border-line bg-surface-1")}>{x.text}<span className={cn("mt-1 block font-mono text-[0.5rem] uppercase tracking-[0.12em]", x.from === "me" ? "text-jet/55" : "text-dim")}>{x.t}</span></p>
                  {x.from === "them" && <button type="button" onClick={() => setPanel({ report: i })} aria-haspopup="dialog" aria-label={t("chat.msg.report")} className="grid size-11 shrink-0 place-items-center text-silver/60 hover:text-cloud"><Flag size={14} strokeWidth={1.5} aria-hidden /></button>}
                </li>
              ))}
            </ul>
            <div ref={end} />
          </Block>

          <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="fixed inset-x-0 bottom-[calc(var(--nav-h)+var(--safe-bottom))] z-40 mx-auto w-full max-w-[480px] border-t border-line bg-jet/95 px-4 pb-3 pt-2 backdrop-blur-xl">
            <p role="alert" aria-live="assertive" className={cn("min-h-4 text-[0.74rem]", err ? "mb-1.5 text-sunset" : "sr-only")}>{err ?? ""}</p>
            {!online && <p role="status" className="mb-1.5 text-[0.74rem] text-cloud/70">{t("chat.offline")}</p>}
            <div className="flex items-end gap-2">
              <label htmlFor="msg" className="sr-only">{t("chat.label")}</label>
              <textarea id="msg" value={text} onChange={(e) => { setText(e.target.value); setErr(null); }} rows={1} placeholder={t("chat.placeholder")} disabled={!online}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
                className="max-h-28 min-h-12 flex-1 resize-none border border-line bg-surface-1 px-4 py-3 text-[1rem] outline-none focus:border-sky disabled:opacity-50" />
              <Button type="submit" disabled={!text.trim() || !online} className="min-h-12 px-5 text-[0.66rem] disabled:opacity-40">{t("chat.send")}</Button>
            </div>
            {text.length > LIMITS.messageMax - 80 && <p className={cn("mt-1 text-right font-mono text-[0.58rem] tabular-nums", text.length > LIMITS.messageMax ? "text-sunset" : "text-dim")}>{text.length}/{LIMITS.messageMax}</p>}
          </form>

          <Sheet open={panel !== null} onClose={() => setPanel(null)}
            eyebrow={panel === "menu" ? t("chat.eyebrow") : panel === "block" ? "" : panel === "delete" ? "" : "Modération"}
            title={panel === "menu" ? (m?.pseudo ?? "") : panel === "block" ? t("member.block.title", { name: m?.pseudo ?? "" }) : panel === "delete" ? t("chat.delete.title") : panel === "done" ? t("report.done.title") : t("report.title", { name: m?.pseudo ?? "" })}>
            {panel === "menu" && (
              <ul className="divide-y divide-line border-y border-line text-[0.95rem]">
                <li><button type="button" onClick={() => { c.toggleMute(id); setPanel(null); }} className="flex min-h-14 w-full items-center text-left">{muted ? t("chat.unmute") : t("chat.mute")}</button></li>
                <li><button type="button" onClick={() => setPanel("report")} className="flex min-h-14 w-full items-center text-left">{t("member.report")}</button></li>
                <li><button type="button" onClick={() => setPanel("block")} className="flex min-h-14 w-full items-center text-left">{t("member.block")}</button></li>
                <li><button type="button" onClick={() => setPanel("delete")} className="flex min-h-14 w-full items-center text-left text-sunset">{t("chat.delete")}</button></li>
              </ul>
            )}
            {panel === "block" && (<>
              <p className="leading-relaxed text-cloud/80">{t("member.block.text")}</p>
              <div className="mt-5 grid gap-3"><Button onClick={() => { c.block(id); closeThenGo(() => setPanel(null), () => router.push("/v3/club/messages")); }}>{t("member.block")}</Button><Button variant="ghost" onClick={() => setPanel(null)}>{t("common.cancel")}</Button></div>
            </>)}
            {panel === "delete" && (<>
              <p className="leading-relaxed text-cloud/80">{t("chat.delete.text")}</p>
              <div className="mt-5 grid gap-3"><Button onClick={() => { c.deleteConversation(id); closeThenGo(() => setPanel(null), () => router.push("/v3/club/messages")); }}>{t("chat.delete")}</Button><Button variant="ghost" onClick={() => setPanel(null)}>{t("common.cancel")}</Button></div>
            </>)}
            {(panel === "report" || reportedIdx >= 0) && <ReportForm name={m?.pseudo ?? ""} chat quote={reportedIdx >= 0 ? msgs[reportedIdx]?.text : undefined} onSend={() => { c.report(id); setPanel("done"); }} onCancel={() => setPanel(null)} />}
            {panel === "done" && (<><p className="leading-relaxed text-cloud/80">{t("report.done.text")}</p><Button variant="ghost" onClick={() => setPanel(null)} className="mt-5 w-full">{t("common.close")}</Button></>)}
          </Sheet>
        </>
      )}
    </CommunityGate>
  );
}
