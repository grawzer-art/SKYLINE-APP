"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenTitle, Block, Empty, DemoTag } from "./ui";
import { Face } from "./visual";
import { CommunityGate } from "./community";
import { ReportForm } from "./ReportForm";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { LIMITS, commonGenres, validateIntro } from "@/domain/community";
import { useCommunity } from "@/lib/useCommunity";
import { closeThenGo } from "@/lib/sheetNav";

type Panel = null | "request" | "block" | "report" | "done";

/** Fiche membre : demande de contact (mot d'introduction facultatif), blocage, signalement — une seule modale, contenu variable. */
export function V3Member({ id }: { id: string }) {
  const c = useCommunity();
  const { t, state } = c;
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>(null);
  const [intro, setIntro] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const m = c.member(id);
  const gate = { eyebrow: t("member.eyebrow"), title: m?.pseudo ?? t("member.eyebrow"), back: { href: "/v3/club/members", label: t("common.members") } };

  return (
    <CommunityGate {...gate}>
      {!m || !m.visible || !state.me.visible ? (
        <><ScreenTitle {...gate} title={t("member.unavailable")} /><Block><Empty title={t("member.unavailable")} text={t("member.unavailable.text")} /></Block></>
      ) : (() => {
        const out = state.outgoing[m.id]; const blocked = state.blocked.includes(m.id); const reported = state.reported.includes(m.id);
        const inCommon = commonGenres(m.genres, state.me.genres);
        const linked = c.linked(m.id);
        const submit = () => {
          const v = validateIntro(intro);
          if (!v.ok) { setErr(t(`chat.err.${v.reason}` as never)); return; }
          const r = c.requestContact(m.id, intro);
          if (!r.ok) { setErr(r.reason === "quota" ? t("member.request.blocked.quota") : r.reason === "pending" ? t("member.request.blocked.pending") : t(`chat.err.${r.reason}` as never)); return; }
          setErr(null); setIntro(""); setPanel(null);
        };
        return (
          <>
            <ScreenTitle {...gate} />
            <Block>
              <div className="flex items-center gap-4"><Face name={m.pseudo} size={76} tone="sky" /><div><p className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-cloud/80">{m.city}</p><p className="mt-1 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-dim">{m.genres.join(" · ")}</p><div className="mt-2"><DemoTag>Profil fictif</DemoTag></div></div></div>
              <p className="mt-5 text-[0.95rem] leading-relaxed text-cloud/85">{m.bio}</p>
              <p className="mt-3 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-sky">{inCommon.length ? t("member.common", { list: inCommon.join(", ") }) : <span className="text-dim">{t("member.common.none")}</span>}</p>
            </Block>
            <Block>
              {blocked ? (
                <div role="status" className="rounded-[8px] border border-dashed border-cloud/25 p-4"><p className="text-[0.9rem]">{t("member.blocked")}</p><Button variant="ghost" className="mt-3 w-full" onClick={() => c.unblock(m.id)}>{t("member.unblock")}</Button></div>
              ) : linked ? (
                <Link href={`/v3/club/messages/${m.id}`} className="flex min-h-12 w-full items-center justify-center rounded-full bg-cloud px-6 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-jet">{t("member.message")}</Link>
              ) : out?.state === "sent" ? (
                <div role="status" className="rounded-[8px] border border-line p-4 text-[0.9rem]">{t("member.request.sent", { name: m.pseudo })}<Button variant="ghost" className="mt-3 w-full" onClick={() => c.cancelRequest(m.id)}>{t("member.request.cancel")}</Button></div>
              ) : (
                <Button onClick={() => { setErr(null); setPanel("request"); }} aria-haspopup="dialog" className="w-full">{t("member.request")}</Button>
              )}
              {!blocked && (
                <div className="mt-4 flex gap-6 font-mono text-[0.72rem] uppercase tracking-[0.16em] text-dim">
                  <button type="button" onClick={() => setPanel("block")} aria-haspopup="dialog" className="min-h-11 underline-offset-4 hover:text-cloud hover:underline">{t("member.block")}</button>
                  <button type="button" onClick={() => setPanel("report")} aria-haspopup="dialog" disabled={reported} className="min-h-11 underline-offset-4 hover:text-cloud hover:underline disabled:no-underline disabled:opacity-60">{reported ? t("member.reported") : t("member.report")}</button>
                </div>
              )}
            </Block>

            <Sheet open={panel !== null} onClose={() => setPanel(null)}
              eyebrow={panel === "request" ? t("member.request.title") : panel === "block" ? "" : "Modération"}
              title={panel === "request" ? m.pseudo : panel === "block" ? t("member.block.title", { name: m.pseudo }) : panel === "done" ? t("report.done.title") : t("report.title", { name: m.pseudo })}>
              {panel === "request" && (<>
                <label htmlFor="intro" className="text-[0.9rem]">{t("member.request.intro")}</label>
                <textarea id="intro" value={intro} maxLength={LIMITS.introMax} rows={3} onChange={(e) => { setIntro(e.target.value); setErr(null); }} aria-describedby="intro-hint"
                  className="mt-2 w-full resize-none border border-line bg-surface-2 px-4 py-3 text-[1rem] outline-none focus:border-sky" />
                <p id="intro-hint" className="mt-1.5 text-[0.72rem] text-dim">{t("member.request.intro.hint", { n: intro.length })}</p>
                {err && <p role="alert" className="mt-2 text-[0.8rem] text-sunset">{err}</p>}
                <p className="mt-3 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-dim">{t("members.quota", { n: c.quotaLeft, max: LIMITS.requestsPerDay })}</p>
                <div className="mt-4 grid gap-3"><Button onClick={submit}>{t("member.request.send")}</Button><Button variant="ghost" onClick={() => setPanel(null)}>{t("common.cancel")}</Button></div>
              </>)}
              {panel === "block" && (<>
                <p className="leading-relaxed text-cloud/80">{t("member.block.text")}</p>
                <div className="mt-5 grid gap-3"><Button onClick={() => { c.block(m.id); closeThenGo(() => setPanel(null), () => router.push("/v3/club/members")); }}>{t("member.block")}</Button><Button variant="ghost" onClick={() => setPanel(null)}>{t("common.cancel")}</Button></div>
              </>)}
              {panel === "report" && <ReportForm name={m.pseudo} onSend={() => { c.report(m.id); setPanel("done"); }} onCancel={() => setPanel(null)} />}
              {panel === "done" && (<><p className="leading-relaxed text-cloud/80">{t("report.done.text")}</p><Button variant="ghost" onClick={() => setPanel(null)} className="mt-5 w-full">{t("common.close")}</Button></>)}
            </Sheet>
          </>
        );
      })()}
    </CommunityGate>
  );
}
